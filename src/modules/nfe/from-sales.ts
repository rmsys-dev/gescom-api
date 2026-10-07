import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import {
  cities,
  ceps,
  db,
  enterprises,
  enterprisesAddress,
  enterprisesMembers,
  enterprisesNfe,
  measurementUnits,
  nfeSales,
  productsEnterprises,
  productsNcm,
  productTypes,
  sales,
  salesItems,
  salesPayments,
  states,
  typeSupplierCustomers,
  users,
  usersAddress,
  usersTaxInfos,
  paymentTypes,
  paymentTypesMethodsFlags,
} from "../../db/schema.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../shared/errors/app-error.js";
import type { EntityAuditContext } from "../../shared/audit/entity-audit.js";
import { buildNfeAccessKey } from "./sefaz/access-key.js";
import { infAdProdText } from "./sefaz/nfe-xml.js";
import { resolveNfePayment } from "./sefaz/payment-detpag.js";
import { loadPaymentConfigCatalog } from "../sales/payment-types-methods-flags/service.js";
import { getCufFromUf, UF_SIGLAS, type UfSigla } from "./sefaz/uf.js";
import type { CreateNfeFromSalesInput, CreateNfeInput } from "./document/schema.js";
import { nfeDocumentService } from "./document/service.js";
import { nfeOperationsStatesService } from "./operations/service.js";
import { salesOfSameMemberUser } from "../sales/same-user-sales.js";

const asNumber = (value: string | number | null | undefined): number => {
  const amount = Number(value ?? 0);
  return Number.isFinite(amount) ? amount : 0;
};

const roundMoney = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

const allocateShares = (values: number[], amount: number) => {
  if (values.length === 0) return [];
  const base = values.reduce((sum, value) => sum + value, 0);
  const total = roundMoney(Math.max(0, amount));
  if (base <= 0 || total <= 0) return values.map(() => 0);
  let allocated = 0;
  return values.map((value, index) => {
    if (index === values.length - 1) return roundMoney(total - allocated);
    const share = roundMoney((total * value) / base);
    allocated = roundMoney(allocated + share);
    return share;
  });
};

const digits = (value: string | null | undefined): string =>
  (value ?? "").replace(/\D/g, "");

const isUf = (value: string): value is UfSigla =>
  (UF_SIGLAS as readonly string[]).includes(value);

const randomCnf = (): string => {
  const value = String(Math.floor(Math.random() * 100_000_000)).padStart(8, "0");
  return value === "00000000" ? "00000001" : value;
};

export class NfeFromSalesService {
  public async create(
    enterpriseId: string,
    input: CreateNfeFromSalesInput,
    audit: EntityAuditContext,
  ) {
    const saleIds = [...new Set(input.saleIds)];
    if (saleIds.length !== input.saleIds.length) {
      throw new BadRequestError(
        "Pedido repetido na lista",
        "NFE_SALE_DUPLICATED",
      );
    }

    const saleRows = await db
      .select({ id: sales.id })
      .from(sales)
      .where(
        and(
          eq(sales.enterprisesId, enterpriseId),
          salesOfSameMemberUser(enterpriseId, input.memberId),
          eq(sales.status, "FINALIZADA"),
          eq(sales.type, "VENDA"),
          inArray(sales.id, saleIds),
        ),
      );
    if (saleRows.length !== saleIds.length) {
      throw new NotFoundError(
        "Pedido nao encontrado, nao finalizado ou de outro cliente",
        "NFE_SALE_NOT_FOUND",
      );
    }

    const alreadyLinked = await db
      .select({ salesId: nfeSales.salesId })
      .from(nfeSales)
      .where(and(inArray(nfeSales.salesId, saleIds), isNull(nfeSales.deletedAt)))
      .limit(1);
    if (alreadyLinked[0]) {
      throw new ConflictError(
        "Pedido ja vinculado a uma nota fiscal",
        "NFE_SALE_ALREADY_LINKED",
      );
    }

    const payload = await this.buildInput(
      enterpriseId,
      input.memberId,
      saleIds,
      input.mod,
      input.nfeOperationsId,
      input.paymentTypeId,
      input.paymentTypesMethodsFlagsId,
    );
    const created = await nfeDocumentService.create(enterpriseId, payload, audit, {
      saleIds,
      destMemberId: input.memberId,
    });
    return this.fitPaymentsToTotal(enterpriseId, created, audit);
  }

  /** Itens não faturados (serviço, devolvido) e impostos somados mudam o vNF; o vPag tem que acompanhar. */
  private async fitPaymentsToTotal(
    enterpriseId: string,
    created: Awaited<ReturnType<typeof nfeDocumentService.create>>,
    audit: EntityAuditContext,
  ) {
    const payments = created.payments ?? [];
    const total = roundMoney(asNumber(created.vNf));
    const paid = roundMoney(payments.reduce((sum, payment) => sum + asNumber(payment.vPag), 0));
    if (payments.length === 0 || total <= 0 || paid === total) return created;
    const shares = allocateShares(
      payments.map((payment) => asNumber(payment.vPag)),
      total,
    );
    const text = (value: string | null | undefined) => value?.trim() || undefined;
    return nfeDocumentService.replacePayments(
      enterpriseId,
      created.id,
      {
        payments: payments.map((payment, index) => ({
          paymentTypeId: payment.paymentTypeId,
          paymentTypesMethodsFlagsId: payment.paymentTypesMethodsFlagsId,
          nSeq: payment.nSeq || index + 1,
          indPag: text(payment.indPag),
          tPag: text(payment.tPag),
          xPag: text(payment.xPag),
          vPag: shares[index] ?? 0,
          cardTpIntegra: text(payment.cardTpIntegra),
          cardCnpj: text(payment.cardCnpj),
          cardTBand: text(payment.cardTBand),
          cardCAut: text(payment.cardCAut),
        })),
      },
      audit,
    );
  }

  private async buildInput(
    enterpriseId: string,
    memberId: string,
    saleIds: string[],
    mod: "55" | "65",
    nfeOperationsId?: string,
    paymentTypeId?: string,
    paymentTypesMethodsFlagsId?: string,
  ): Promise<CreateNfeInput> {
    const [enterprise] = await db
      .select({
        registration: enterprises.registration,
        legalName: enterprises.legalName,
        tradeName: enterprises.tradeName,
        phone: enterprises.phone,
        stateRegistration: enterprises.stateRegistration,
        crt: enterprises.crt,
        ibgeCode: cities.ibgeCode,
        cityName: cities.citieName,
        uf: states.acronym,
        street: ceps.address,
        neighborhood: ceps.neighborhood,
        cepNumber: ceps.cepNumber,
        number: enterprisesAddress.number,
        complement: enterprisesAddress.complement,
      })
      .from(enterprises)
      .innerJoin(
        enterprisesAddress,
        and(
          eq(enterprisesAddress.enterpriseId, enterprises.id),
          eq(enterprisesAddress.adressType, "PRINCIPAL"),
          isNull(enterprisesAddress.deletedAt),
        ),
      )
      .innerJoin(ceps, eq(ceps.id, enterprisesAddress.cepId))
      .innerJoin(cities, eq(cities.id, ceps.cityId))
      .innerJoin(states, eq(states.id, cities.stateId))
      .where(and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)))
      .limit(1);
    if (!enterprise || !isUf(enterprise.uf)) {
      throw new BadRequestError(
        "Empresa sem endereco principal para emitir a nota",
        "NFE_ENTERPRISE_ADDRESS_REQUIRED",
      );
    }

    const [settings] = await db
      .select({
        ambiente: enterprisesNfe.ambiente,
        serieNfe: enterprisesNfe.serieNfe,
        serieNfce: enterprisesNfe.serieNfce,
      })
      .from(enterprisesNfe)
      .where(
        and(
          eq(enterprisesNfe.enterpriseId, enterpriseId),
          isNull(enterprisesNfe.deletedAt),
        ),
      )
      .limit(1);
    if (!settings) {
      throw new NotFoundError(
        "Configuracao de NF-e nao encontrada",
        "NFE_SETTINGS_NOT_FOUND",
      );
    }

    const [customer] = await db
      .select({
        userName: users.userName,
        userRegistration: users.userRegistration,
        userEmail: users.userEmail,
        userPhone: users.userPhone,
        stateRegistration: usersAddress.stateRegistration,
        suframaRegistration: usersTaxInfos.suframa_registration,
        endConsumer: typeSupplierCustomers.endConsumer,
        number: usersAddress.number,
        complement: usersAddress.complement,
        street: ceps.address,
        neighborhood: ceps.neighborhood,
        cepNumber: ceps.cepNumber,
        cityName: cities.citieName,
        ibgeCode: cities.ibgeCode,
        uf: states.acronym,
      })
      .from(enterprisesMembers)
      .innerJoin(users, eq(users.id, enterprisesMembers.userId))
      .leftJoin(
        typeSupplierCustomers,
        eq(typeSupplierCustomers.id, enterprisesMembers.typeSupplierCustomerId),
      )
      .leftJoin(
        usersAddress,
        and(
          eq(usersAddress.userId, users.id),
          eq(usersAddress.adressType, "PRINCIPAL"),
          isNull(usersAddress.deletedAt),
        ),
      )
      .leftJoin(
        usersTaxInfos,
        and(eq(usersTaxInfos.userId, users.id), isNull(usersTaxInfos.deletedAt)),
      )
      .leftJoin(ceps, eq(ceps.id, usersAddress.cepId))
      .leftJoin(cities, eq(cities.id, ceps.cityId))
      .leftJoin(states, eq(states.id, cities.stateId))
      .where(
        and(
          eq(enterprisesMembers.id, memberId),
          eq(enterprisesMembers.enterpriseId, enterpriseId),
          isNull(enterprisesMembers.deletedAt),
        ),
      )
      .limit(1);
    if (!customer) {
      throw new NotFoundError("Cliente nao encontrado", "NFE_CUSTOMER_NOT_FOUND");
    }

    const destinationUf = mod === "65" ? enterprise.uf : customer.uf?.toUpperCase();
    if (!destinationUf || !isUf(destinationUf)) {
      throw new BadRequestError(
        "Cliente sem UF para a operacao fiscal",
        "NFE_OPERATION_UF_REQUIRED",
      );
    }
    const saleOperation = nfeOperationsId
      ? await nfeOperationsStatesService.requireActive(nfeOperationsId)
      : await nfeOperationsStatesService.findActiveByDescription("Venda");
    const operations = await nfeOperationsStatesService.listByUf(
      enterpriseId,
      destinationUf,
      saleOperation.id,
    );
    const sharedDescription = operations.every(
      (operation) => operation.cfopDescription === operations[0]?.cfopDescription,
    )
      ? operations[0]?.cfopDescription
      : undefined;
    const sameState = destinationUf === enterprise.uf;

    const saleFinancials = await db
      .select({
        id: sales.id,
        valueDiscountFinancialProduct: sales.valueDiscountFinancialProduct,
        valueAcresceFinancialProduct: sales.valueAcresceFinancialProduct,
      })
      .from(sales)
      .where(inArray(sales.id, saleIds));
    const financialBySale = new Map(
      saleFinancials.map((sale) => [
        sale.id,
        {
          discount: asNumber(sale.valueDiscountFinancialProduct),
          increase: asNumber(sale.valueAcresceFinancialProduct),
        },
      ]),
    );
    const itemRows = await db
      .select({
        salesId: salesItems.salesId,
        productsEnterprisesId: salesItems.productsEnterprisesId,
        quantity: salesItems.quantity,
        quantityReturned: salesItems.quantityReturned,
        valueUnit: salesItems.valueUnit,
        valueDiscount: salesItems.valueDiscount,
        valueAcresce: salesItems.valueAcresce,
        valueTotal: salesItems.valueTotal,
        itemDescription: salesItems.description,
        productDescription: productsEnterprises.description,
        productAdditional: productsEnterprises.additionalProduct,
        productCode: productsEnterprises.code,
        productType: productTypes.type,
        ncm: productsNcm.ncm,
        unit: measurementUnits.unit,
      })
      .from(salesItems)
      .innerJoin(
        productsEnterprises,
        eq(productsEnterprises.id, salesItems.productsEnterprisesId),
      )
      .innerJoin(
        measurementUnits,
        eq(measurementUnits.id, productsEnterprises.measurementUnitId),
      )
      .innerJoin(productTypes, eq(productTypes.id, salesItems.productTypeId))
      .leftJoin(productsNcm, eq(productsNcm.id, productsEnterprises.productNcmId))
      .where(inArray(salesItems.salesId, saleIds))
      .orderBy(asc(salesItems.salesId), asc(salesItems.id));
    const headerShareByItem = new Map<
      typeof itemRows[number],
      { discount: number; increase: number }
    >();
    const bySale = new Map<string, typeof itemRows>();
    for (const item of itemRows) {
      const group = bySale.get(item.salesId) ?? [];
      group.push(item);
      bySale.set(item.salesId, group);
    }
    for (const [saleId, group] of bySale) {
      const products = group.filter((item) => item.productType !== "09");
      const financial = financialBySale.get(saleId) ?? { discount: 0, increase: 0 };
      const lineTotals = products.map((item) => asNumber(item.valueTotal));
      const discounts = allocateShares(lineTotals, financial.discount);
      const increases = allocateShares(lineTotals, financial.increase);
      products.forEach((item, index) =>
        headerShareByItem.set(item, {
          discount: discounts[index] ?? 0,
          increase: increases[index] ?? 0,
        }),
      );
    }
    const billableItems = itemRows.flatMap((item) => {
      const quantity = asNumber(item.quantity);
      const returned = asNumber(item.quantityReturned);
      const remaining = Math.max(0, quantity - returned);
      if (item.productType === "09" || remaining <= 0) return [];
      const ratio = quantity > 0 ? remaining / quantity : 0;
      const header = headerShareByItem.get(item) ?? { discount: 0, increase: 0 };
      const valueUnit = asNumber(item.valueUnit);
      const grossTotal = roundMoney(remaining * valueUnit);
      const net = roundMoney(
        Math.max(0, asNumber(item.valueTotal) - header.discount + header.increase) * ratio,
      );
      let discount = roundMoney((asNumber(item.valueDiscount) + header.discount) * ratio);
      let increase = roundMoney((asNumber(item.valueAcresce) + header.increase) * ratio);
      const drift = roundMoney(grossTotal - discount + increase - net);
      if (drift !== 0) {
        if (discount > 0 && discount + drift >= 0) discount = roundMoney(discount + drift);
        else if (increase > 0 && increase - drift >= 0) increase = roundMoney(increase - drift);
        else if (drift > 0) discount = drift;
        else increase = -drift;
      }
      return [{
        ...item,
        quantity: remaining,
        valueUnit,
        grossTotal,
        discount,
        increase,
      }];
    });
    if (billableItems.length === 0) {
      throw new BadRequestError(
        "Pedidos sem itens para a nota",
        "NFE_SALE_ITEMS_REQUIRED",
      );
    }

    const paymentRows = await db
      .select({
        paymentTypeId: salesPayments.paymentTypeId,
        paymentTypesMethodsFlagsId: salesPayments.paymentTypesMethodsFlagsId,
        valueTotal: salesPayments.valueTotal,
        paymentType: paymentTypes.paymentType,
        description: paymentTypes.description,
      })
      .from(salesPayments)
      .innerJoin(paymentTypes, eq(paymentTypes.id, salesPayments.paymentTypeId))
      .where(inArray(salesPayments.salesId, saleIds));
    if (paymentRows.length === 0) {
      throw new BadRequestError(
        "Pedidos sem pagamento para a nota",
        "NFE_SALE_PAYMENTS_REQUIRED",
      );
    }

    const indPagOf = (kind: string) =>
      kind === "A_VISTA" ? "0" : kind === "A_PRAZO" ? "1" : undefined;

    const paymentByType = new Map<
      string,
      {
        paymentTypeId: string;
        paymentTypesMethodsFlagsId: string | null;
        vPag: number;
        indPag?: "0" | "1";
        description: string;
      }
    >();
    for (const payment of paymentRows) {
      const key = `${payment.paymentTypeId}:${payment.paymentTypesMethodsFlagsId ?? ""}`;
      const current = paymentByType.get(key);
      if (current) {
        current.vPag += asNumber(payment.valueTotal);
      } else {
        paymentByType.set(key, {
          paymentTypeId: payment.paymentTypeId,
          paymentTypesMethodsFlagsId: payment.paymentTypesMethodsFlagsId,
          vPag: asNumber(payment.valueTotal),
          indPag: indPagOf(payment.paymentType),
          description: payment.description,
        });
      }
    }

    if (paymentTypeId || paymentTypesMethodsFlagsId) {
      let chosenTypeId = paymentTypeId;
      if (paymentTypesMethodsFlagsId) {
        const [config] = await db
          .select({
            paymentTypesId: paymentTypesMethodsFlags.paymentTypesId,
            status: paymentTypesMethodsFlags.status,
          })
          .from(paymentTypesMethodsFlags)
          .where(
            and(
              eq(paymentTypesMethodsFlags.id, paymentTypesMethodsFlagsId),
              eq(paymentTypesMethodsFlags.enterprisesId, enterpriseId),
            ),
          )
          .limit(1);
        if (!config || config.status !== "ATIVO") {
          throw new NotFoundError(
            "Configuracao de pagamento nao encontrada",
            "PAYMENT_CONFIG_NOT_FOUND",
          );
        }
        if (paymentTypeId && paymentTypeId !== config.paymentTypesId) {
          throw new BadRequestError(
            "Configuracao de pagamento pertence a outro tipo de pagamento",
            "PAYMENT_CONFIG_TYPE_MISMATCH",
          );
        }
        chosenTypeId = config.paymentTypesId;
      }
      const [chosen] = await db
        .select({
          id: paymentTypes.id,
          paymentType: paymentTypes.paymentType,
          status: paymentTypes.status,
          description: paymentTypes.description,
        })
        .from(paymentTypes)
        .where(eq(paymentTypes.id, chosenTypeId!))
        .limit(1);
      if (!chosen || chosen.status !== "ATIVO") {
        throw new NotFoundError(
          "Tipo de pagamento nao encontrado",
          "PAYMENT_TYPE_NOT_FOUND",
        );
      }
      const total = roundMoney(
        [...paymentByType.values()].reduce((sum, payment) => sum + payment.vPag, 0),
      );
      paymentByType.clear();
      paymentByType.set(chosen.id, {
        paymentTypeId: chosen.id,
        paymentTypesMethodsFlagsId: paymentTypesMethodsFlagsId ?? null,
        vPag: total,
        indPag: indPagOf(chosen.paymentType),
        description: chosen.description,
      });
    }

    const paymentCatalog = await loadPaymentConfigCatalog(
      enterpriseId,
      [...paymentByType.values()].flatMap((payment) =>
        payment.paymentTypesMethodsFlagsId ? [payment.paymentTypesMethodsFlagsId] : [],
      ),
    );

    const serie = String(mod === "65" ? settings.serieNfce : settings.serieNfe);
    const cNf = randomCnf();
    const now = new Date();
    const yearMonth = `${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const cUf = getCufFromUf(enterprise.uf);
    const registration = digits(enterprise.registration);
    const tpEmis = 1;
    const chave = buildNfeAccessKey({
      cUf,
      yearMonth,
      cnpj: registration.padStart(14, "0"),
      mod,
      serie,
      nNf: 0,
      tpEmis,
      cNf,
    });
    const customerDocument = digits(customer.userRegistration);
    const customerIsuf = digits(customer.suframaRegistration);
    const rawIe = customer.stateRegistration?.trim() ?? "";
    const customerIe = digits(rawIe).slice(0, 14);
    const indIeDest =
      mod === "65"
        ? "9"
        : customerIe
          ? "1"
          : rawIe.toUpperCase().startsWith("ISENT")
            ? "2"
            : "9";
    const customerUf =
      mod === "55"
        ? destinationUf
        : customer.uf && isUf(customer.uf)
          ? customer.uf
          : undefined;

    return {
      chave,
      cUf,
      cNf,
      natOp: sharedDescription?.slice(0, 60) ?? saleOperation.description.slice(0, 60),
      nfeOperationsId: saleOperation.id,
      mod,
      serie,
      dhEmi: now.toISOString(),
      tpNf: "1",
      idDest: mod === "65" || sameState ? "1" : "2",
      cMunFg: enterprise.ibgeCode,
      tpImp: mod === "65" ? "4" : "1",
      tpEmis,
      cDv: chave.slice(43),
      tpAmb: settings.ambiente === 1 ? 1 : 2,
      finNfe: "1",
      indFinal: customer.endConsumer ? "1" : "0",
      indPres: "1",
      moviments: "SAIDA",
      issuanceType: "PROPRIA",
      emit: {
        cnpj: registration.length === 14 ? registration : undefined,
        cpf: registration.length === 11 ? registration : undefined,
        xNome: enterprise.legalName.slice(0, 60),
        xFant: enterprise.tradeName.slice(0, 60),
        ie: enterprise.stateRegistration ?? undefined,
        crt: enterprise.crt ?? undefined,
        xlgr: enterprise.street?.slice(0, 60),
        nro: enterprise.number.slice(0, 60),
        xcpl: enterprise.complement?.slice(0, 60),
        xbairro: enterprise.neighborhood?.slice(0, 60),
        cmun: String(enterprise.ibgeCode),
        xmun: enterprise.cityName.slice(0, 60),
        uf: enterprise.uf,
        cep: digits(enterprise.cepNumber).slice(0, 8),
        fone: digits(enterprise.phone).slice(0, 14) || undefined,
      },
      dest: {
        cnpj: customerDocument.length === 14 ? customerDocument : undefined,
        cpf: customerDocument.length === 11 ? customerDocument : undefined,
        xNome: customer.userName.slice(0, 60),
        indIeDest,
        ie: indIeDest === "1" ? customerIe : undefined,
        isuf:
          customerIsuf.length === 8 || customerIsuf.length === 9 ? customerIsuf : undefined,
        email: customer.userEmail?.slice(0, 60),
        xlgr: customer.street?.slice(0, 60),
        nro: customer.number?.slice(0, 60),
        xcpl: customer.complement?.slice(0, 60),
        xbairro: customer.neighborhood?.slice(0, 60),
        cmun: customer.ibgeCode ? String(customer.ibgeCode) : undefined,
        xmun: customer.cityName?.slice(0, 60),
        uf: customerUf,
        cep: digits(customer.cepNumber).slice(0, 8) || undefined,
        fone: digits(customer.userPhone).slice(0, 14) || undefined,
      },
      items: billableItems.map((item, index) => {
        const ncm = digits(item.ncm).slice(0, 8);
        const description = (item.itemDescription || item.productDescription).slice(0, 120);
        return {
          productsEnterprisesId: item.productsEnterprisesId,
          nItem: index + 1,
          cProd: item.productCode ? String(item.productCode).slice(0, 60) : undefined,
          xProd: description || "PRODUTO",
          ncm: ncm.length > 0 ? ncm : undefined,
          uCom: item.unit.slice(0, 6),
          qCom: asNumber(item.quantity),
          vUnCom: item.valueUnit,
          vProd: item.grossTotal,
          vDesc: item.discount > 0 ? item.discount : undefined,
          vOutro: item.increase > 0 ? item.increase : undefined,
          infAdProd: infAdProdText(item.productAdditional),
        };
      }),
      payments: [...paymentByType.values()].map((payment, index) => {
        const config = payment.paymentTypesMethodsFlagsId
          ? paymentCatalog.get(payment.paymentTypesMethodsFlagsId)
          : undefined;
        const resolved = resolveNfePayment(
          {},
          {
            paymentCode: config?.paymentCode,
            integration: config?.integration,
            flagCode: config?.flagCode,
            flagDescription: config?.flagDescription,
            paymentDescription: payment.description,
            cnpj: config?.cnpj,
          },
        );
        return {
          paymentTypeId: payment.paymentTypeId,
          paymentTypesMethodsFlagsId: payment.paymentTypesMethodsFlagsId,
          nSeq: index + 1,
          indPag: payment.indPag,
          vPag: payment.vPag,
          ...resolved,
        };
      }),
    };
  }
}

export const nfeFromSalesService = new NfeFromSalesService();
