import { and, asc, count, desc, eq, gte, ilike, inArray, isNull, lte, or, sql, type AnyColumn } from "drizzle-orm";
import { isValidGtin } from "../../../shared/validation/data-normalizers.js";
import {
  cfopsEnterprises,
  classificationIbsCbs,
  cstIbsCbs,
  db,
  enterprisesPrintModels,
  nfeDuplicates,
  nfeHeaders,
  nfeItems,
  nfeItemTaxes,
  nfePayments,
  nfeSales,
  nfeTransports,
  paymentTypes,
  sales,
  measurementUnits,
  nfeOperations,
  nfeTransportVolumes,
  prices,
  productTypes,
  products,
  productsEnterprises,
  productsNcm,
  states,
} from "../../../db/schema.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import {
  assertNfeNumberAvailable,
  nextNfeNumber,
  syncNfeSequenceFloor,
} from "../sequences.js";
import { applyStateOperationToNote } from "../operations/service.js";
import { PRODUCT_TYPE_SERVICE_CODE } from "../../../shared/products/product-type-service.js";
import {
  accessKeyWithInvoiceNumber,
  accessKeyWithSerie,
} from "../sefaz/access-key.js";
import { resolveNfePayment } from "../sefaz/payment-detpag.js";
import {
  assertPaymentConfigsMatch,
  loadPaymentConfigCatalog,
} from "../../sales/payment-types-methods-flags/service.js";
import { buildNfeXml, formatSefazDateTime, infAdProdText } from "../sefaz/nfe-xml.js";
import { autorizarNfe } from "../sefaz/autorizacao.js";
import { buildProcNFeXml } from "../sefaz/autorizacao-xml.js";
import { signNfeXml } from "../sefaz/sign-xml.js";
import { buildNfceSupl, insertNfceSupl, type NfceSupl } from "../sefaz/nfce-qrcode.js";
import { assertNfeXmlSchema } from "../sefaz/validate-xml.js";
import type { UfSigla } from "../sefaz/uf.js";
import { resolveEmitUf } from "./emit-uf.js";
import {
  nfeProcXmlRelativePath,
  nfeSignedXmlRelativePath,
} from "../sefaz/xml-path.js";
import { readStoredNfeXml, writeNfeXmlFile } from "../sefaz/xml-store.js";
import { nfeConfiguracaoService } from "../configuracao/service.js";
import {
  calculateItemTax,
  sumInvoiceTotals,
  type CalculatedItemTax,
  type InvoiceTotals,
  type TaxRateInput,
} from "../tax/calculate.js";
import type {
  CreateNfeInput,
  LinkCfopEnterpriseInput,
  ListNfeQuery,
  PatchNfeInput,
  RecalculateNfeItemsInput,
  ReplaceNfeItemsInput,
  ReplaceNfeDuplicatesInput,
  ReplaceNfePaymentsInput,
  ReplaceNfeTransportInput,
} from "./schema.js";

const money = (value: number | null | undefined): string | null =>
  value === undefined || value === null ? null : value.toFixed(2);

const rate = (value: number | null | undefined, scale = 4): string | null =>
  value === undefined || value === null ? null : value.toFixed(scale);

const emitParty = (input?: CreateNfeInput["emit"]) =>
  input
    ? {
        emitCnpj: input.cnpj,
        emitCpf: input.cpf,
        emitXNome: input.xNome,
        emitXFant: input.xFant,
        emitIe: input.ie,
        emitCrt: input.crt,
        emitXlgr: input.xlgr,
        emitNro: input.nro,
        emitXcpl: input.xcpl,
        emitXbairro: input.xbairro,
        emitCmun: input.cmun,
        emitXmun: input.xmun,
        emitUf: input.uf,
        emitCep: input.cep,
        emitCpais: input.cpais,
        emitXpais: input.xpais,
        emitFone: input.fone,
      }
    : {};

const numericStateRegistration = (value: string | null | undefined) => {
  const digits = (value ?? "").replace(/\D/g, "");
  return /^\d{2,14}$/.test(digits) ? digits : "";
};

const destinationIe = (
  mod: string | null | undefined,
  rawIe: string | null | undefined,
  storedIndicator: string | null | undefined,
) => {
  if (mod === "65") return { indIeDest: "9", ie: undefined };
  const ie = numericStateRegistration(rawIe);
  if (ie) return { indIeDest: "1", ie };
  const text = (rawIe ?? "").trim().toUpperCase();
  if (text.startsWith("ISENT") || storedIndicator === "2") {
    return { indIeDest: "2", ie: undefined };
  }
  return { indIeDest: "9", ie: undefined };
};

const destParty = (input?: CreateNfeInput["dest"]) =>
  input
    ? {
        destCnpj: input.cnpj,
        destCpf: input.cpf,
        destXNome: input.xNome,
        destIndIeDest: input.indIeDest,
        destIe: input.ie,
        destIsuf: input.isuf,
        destEmail: input.email,
        destXlgr: input.xlgr,
        destNro: input.nro,
        destXcpl: input.xcpl,
        destXbairro: input.xbairro,
        destCmun: input.cmun,
        destXmun: input.xmun,
        destUf: input.uf,
        destCep: input.cep,
        destCpais: input.cpais,
        destXpais: input.xpais,
        destFone: input.fone,
      }
    : {};

const NFCE_EMISSION_FRESH_MS = 60_000;

/** A empresa só emite os modelos parametrizados no cadastro dela. */
const assertEnterpriseEmitsModel = async (enterpriseId: string, mod: string) => {
  const rows = await db
    .select({ code: enterprisesPrintModels.documentModelCode })
    .from(enterprisesPrintModels)
    .where(eq(enterprisesPrintModels.enterpriseId, enterpriseId));
  if (rows.some((row) => row.code === mod)) return;
  throw new BadRequestError(
    rows.length
      ? `A empresa nao emite o modelo ${mod}. Modelos habilitados: ${rows.map((row) => row.code).sort().join(", ")}.`
      : "Nenhum modelo de nota parametrizado na empresa. Informe os modelos em Empresas > Alterar.",
    "NFE_MODEL_NOT_ENABLED",
  );
};

const assertUniqueNumbers = (
  values: number[],
  message: string,
  code: string,
) => {
  const seen = new Set<number>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new BadRequestError(message, code);
    }
    seen.add(value);
  }
};

const ratesFromTax = (
  tax: CreateNfeInput["items"][number]["tax"],
): TaxRateInput => ({
  icmsCst: tax?.icmsCst,
  indDeduzDeson: tax?.indDeduzDeson,
  pIcms: tax?.pIcms,
  pFcp: tax?.pFcp,
  pRedBc: tax?.pRedBc,
  pMvaSt: tax?.pMvaSt,
  pRedBcSt: tax?.pRedBcSt,
  pIcmsSt: tax?.pIcmsSt,
  pIcmsUfDest: tax?.pIcmsUfDest,
  pIcmsInter: tax?.pIcmsInter,
  pIcmsInterPart: tax?.pIcmsInterPart,
  pFcpUfDest: tax?.pFcpUfDest,
  difalCalculation: tax?.difalCalculation,
  qBcMono: tax?.qBcMono,
  adRemIcms: tax?.adRemIcms,
  pIpi: tax?.pIpi,
  qUnidIpi: tax?.qUnidIpi,
  vUnidIpi: tax?.vUnidIpi,
  pPis: tax?.pPis,
  qBcProdPis: tax?.qBcProdPis,
  vAliqProdPis: tax?.vAliqProdPis,
  pCofins: tax?.pCofins,
  qBcProdCofins: tax?.qBcProdCofins,
  vAliqProdCofins: tax?.vAliqProdCofins,
  pIssqn: tax?.pIssqn,
  vBcIssqn: tax?.vBcIssqn,
  pIs: tax?.pIs,
  vBcIs: tax?.vBcIs,
  vBcIbsCbs: tax?.vBcIbsCbs,
  pIbsUf: tax?.pIbsUf,
  pRedIbsUf: tax?.pRedIbsUf,
  pIbsMun: tax?.pIbsMun,
  pRedIbsMun: tax?.pRedIbsMun,
  pCbs: tax?.pCbs,
  pRedCbs: tax?.pRedCbs,
});

const headerTotals = (totals: InvoiceTotals) => ({
  vBc: money(totals.vBc),
  vIcms: money(totals.vIcms),
  vIcmsDeson: money(totals.vIcmsDeson),
  vFcp: money(totals.vFcp),
  vBcSt: money(totals.vBcSt),
  vSt: money(totals.vSt),
  vProd: money(totals.vProd),
  vFrete: money(totals.vFrete),
  vSeg: money(totals.vSeg),
  vDesc: money(totals.vDesc),
  vOutro: money(totals.vOutro),
  vIi: money(totals.vIi),
  vIpi: money(totals.vIpi),
  vPis: money(totals.vPis),
  vCofins: money(totals.vCofins),
  vIcmsUfDest: money(totals.vIcmsUfDest),
  vIcmsUfRemet: money(totals.vIcmsUfRemet),
  vFcpUfDest: money(totals.vFcpUfDest),
  vIcmsMono: money(totals.vIcmsMono),
  vIs: money(totals.vIs),
  vBcIbsCbs: money(totals.vBcIbsCbs),
  vIbsUf: money(totals.vIbsUf),
  vIbsMun: money(totals.vIbsMun),
  vIbs: money(totals.vIbs),
  vCbs: money(totals.vCbs),
  vNf: money(totals.vNf),
  vNfTot: money(totals.vNfTot),
  vTotTrib: money(totals.vTotTrib),
});

const calculatedTaxValues = (result: CalculatedItemTax) => ({
  icmsVBc: money(result.vBc),
  icmsVIcms: money(result.vIcms),
  icmsVIcmsDeson: money(result.vIcmsDeson),
  icmsVFcp: money(result.vFcp),
  ipiVBc: money(result.ipiVBc),
  ipiVIpi: money(result.vIpi),
  icmsVBcSt: money(result.vBcSt),
  icmsVIcmsSt: money(result.vIcmsSt),
  icmsVBcUfDest: money(result.vBcUfDest),
  icmsVBcFcpUfDest: money(result.vBcFcpUfDest),
  icmsVIcmsUfDest: money(result.vIcmsUfDest),
  icmsVIcmsUfRemet: money(result.vIcmsUfRemet),
  icmsVFcpUfDest: money(result.vFcpUfDest),
  icmsVIcmsMono: money(result.vIcmsMono),
  pisVBc: money(result.pisVBc),
  pisVPis: money(result.vPis),
  cofinsVBc: money(result.cofinsVBc),
  cofinsVCofins: money(result.vCofins),
  issqnVBc: money(result.issqnVBc),
  issqnVIssqn: money(result.vIssqn),
  isVBc: money(result.vBcIs),
  isVIs: money(result.vIs),
  ibsCbsVBc: money(result.vBcIbsCbs),
  ibsUfPAliqEfet: rate(result.pAliqEfetIbsUf),
  ibsUfVIbs: money(result.vIbsUf),
  ibsMunPAliqEfet: rate(result.pAliqEfetIbsMun),
  ibsMunVIbs: money(result.vIbsMun),
  ibsVIbs: money(result.vIbs),
  cbsPAliqEfet: rate(result.pAliqEfetCbs),
  cbsVCbs: money(result.vCbs),
  vTotTrib: money(result.vTotTrib),
});

type PreparedNfeItem = {
  item: CreateNfeInput["items"][number];
  classTrib?: string;
  classCst?: string;
  classRedIbs: string | null;
  classRedCbs: string | null;
  result: CalculatedItemTax;
};

export class NfeDocumentService {
  private async loadDraft(enterpriseId: string, nfeId: string) {
    const rows = await db
      .select()
      .from(nfeHeaders)
      .where(
        and(
          eq(nfeHeaders.id, nfeId),
          eq(nfeHeaders.enterpriseId, enterpriseId),
          isNull(nfeHeaders.deletedAt),
        ),
      )
      .limit(1);
    const header = rows[0];
    if (!header) {
      throw new NotFoundError("Nota fiscal nao encontrada", "NFE_NOT_FOUND");
    }
    if (header.status !== "PENDENTE" && header.status !== "REJEITADA") {
      throw new BadRequestError(
        "Somente nota pendente ou rejeitada pode ser alterada",
        "NFE_NOT_PENDING",
      );
    }
    return header;
  }

  private async prepareNfeDocument(
    enterpriseId: string,
    input: CreateNfeInput,
  ): Promise<{ items: PreparedNfeItem[]; totals: InvoiceTotals }> {
    assertUniqueNumbers(
      input.items.map((item) => item.nItem),
      "Numero do item repetido",
      "NFE_ITEM_DUPLICATED",
    );
    assertUniqueNumbers(
      input.payments.map((payment) => payment.nSeq),
      "Sequencia do pagamento repetida",
      "NFE_PAYMENT_DUPLICATED",
    );

    const productIds = [
      ...new Set(input.items.map((item) => item.productsEnterprisesId)),
    ];
    const products = await db
      .select({
        id: productsEnterprises.id,
        type: productTypes.type,
      })
      .from(productsEnterprises)
      .innerJoin(
        productTypes,
        eq(productTypes.id, productsEnterprises.productTypeId),
      )
      .where(
        and(
          eq(productsEnterprises.enterprisesId, enterpriseId),
          inArray(productsEnterprises.id, productIds),
        ),
      );
    const productIdSet = new Set(products.map((product) => product.id));
    if (productIds.some((id) => !productIdSet.has(id))) {
      throw new NotFoundError(
        "Produto da empresa nao encontrado",
        "PRODUCT_ENTERPRISE_NOT_FOUND",
      );
    }
    const serviceProductIds = new Set(
      products
        .filter((product) => product.type === PRODUCT_TYPE_SERVICE_CODE)
        .map((product) => product.id),
    );
    const billableItems = input.items
      .filter((item) => !serviceProductIds.has(item.productsEnterprisesId))
      .map((item, index) => ({ ...item, nItem: index + 1 }));
    if (billableItems.length === 0) {
      throw new BadRequestError(
        "Nota fiscal sem itens de mercadoria para gravar",
        "NFE_ITEMS_REQUIRED",
      );
    }

    const paymentTypeIds = [
      ...new Set(input.payments.map((payment) => payment.paymentTypeId)),
    ];
    const payments = await db
      .select({ id: paymentTypes.id })
      .from(paymentTypes)
      .where(inArray(paymentTypes.id, paymentTypeIds));
    const paymentTypeIdSet = new Set(payments.map((payment) => payment.id));
    if (paymentTypeIds.some((id) => !paymentTypeIdSet.has(id))) {
      throw new NotFoundError(
        "Tipo de pagamento nao encontrado",
        "PAYMENT_TYPE_NOT_FOUND",
      );
    }
    await assertPaymentConfigsMatch(enterpriseId, input.payments);

    const classificationIds = [
      ...new Set(
        billableItems.flatMap((item) =>
          item.tax?.classificationIbsCbsId
            ? [item.tax.classificationIbsCbsId]
            : [],
        ),
      ),
    ];
    const classifications = classificationIds.length
      ? await db
          .select({
            id: classificationIbsCbs.id,
            cClassTrib: classificationIbsCbs.cClassTrib,
            pRedIbs: classificationIbsCbs.pRedIbs,
            pRedCbs: classificationIbsCbs.pRedCbs,
            cst: cstIbsCbs.cst,
          })
          .from(classificationIbsCbs)
          .innerJoin(cstIbsCbs, eq(cstIbsCbs.id, classificationIbsCbs.cstIbsCbsId))
          .where(inArray(classificationIbsCbs.id, classificationIds))
      : [];
    const classificationById = new Map(
      classifications.map((row) => [row.id, row]),
    );
    if (classificationIds.some((id) => !classificationById.has(id))) {
      throw new NotFoundError(
        "Classificacao IBS/CBS nao encontrada",
        "CLASSIFICATION_IBS_CBS_NOT_FOUND",
      );
    }

    const items = billableItems.map((item) => {
      const classification = item.tax?.classificationIbsCbsId
        ? classificationById.get(item.tax.classificationIbsCbsId)
        : undefined;
      const amounts = {
        vProd: item.vProd,
        vFrete: item.vFrete,
        vSeg: item.vSeg,
        vDesc: item.vDesc,
        vOutro: item.vOutro,
      };
      return {
        item,
        classTrib: classification?.cClassTrib,
        classCst: classification?.cst,
        classRedIbs: classification?.pRedIbs ?? null,
        classRedCbs: classification?.pRedCbs ?? null,
        result: calculateItemTax(amounts, ratesFromTax(item.tax)),
      };
    });
    const totals = sumInvoiceTotals(
      items.map((entry) => ({
        amounts: {
          vProd: entry.item.vProd,
          vFrete: entry.item.vFrete,
          vSeg: entry.item.vSeg,
          vDesc: entry.item.vDesc,
          vOutro: entry.item.vOutro,
        },
        tax: entry.result,
      })),
    );
    return { items, totals };
  }

  public async create(
    enterpriseId: string,
    input: CreateNfeInput,
    audit: EntityAuditContext,
    links?: { saleIds: string[]; destMemberId: string },
  ) {
    input = await applyStateOperationToNote(enterpriseId, input, links?.destMemberId);
    const issuanceType = input.issuanceType ?? "PROPRIA";
    if (issuanceType === "TERCEIRO" && input.nNf === undefined) {
      throw new BadRequestError(
        "Informe o numero da nota de terceiro",
        "NFE_NUMBER_REQUIRED",
      );
    }
    if (issuanceType === "PROPRIA") await assertEnterpriseEmitsModel(enterpriseId, input.mod);

    const emission =
      issuanceType === "PROPRIA"
        ? await nfeConfiguracaoService.getEmissionSettings(enterpriseId)
        : null;
    const tpAmb = emission ? emission.ambiente : input.tpAmb;
    const prepared = await this.prepareNfeDocument(enterpriseId, input);
    const ownSerie = emission
      ? String(input.mod === "65" ? emission.serieNfce : emission.serieNfe)
      : undefined;

    try {
      const createdId = await db.transaction(async (tx) => {
        let nNf: number;
        if (issuanceType === "PROPRIA") {
          if (input.nNf !== undefined) {
            await assertNfeNumberAvailable(
              enterpriseId,
              input.mod,
              input.nNf,
              tx,
              ownSerie,
            );
            await syncNfeSequenceFloor(enterpriseId, input.mod, input.nNf, tx);
            nNf = input.nNf;
          } else {
            nNf = await nextNfeNumber(enterpriseId, input.mod, tx, ownSerie);
          }
        } else {
          nNf = input.nNf!;
        }

        if (links?.saleIds.length) {
          const linked = await tx
            .select({ salesId: nfeSales.salesId })
            .from(nfeSales)
            .where(
              and(
                inArray(nfeSales.salesId, links.saleIds),
                isNull(nfeSales.deletedAt),
              ),
            )
            .limit(1);
          if (linked[0]) {
            throw new ConflictError(
              "Pedido ja vinculado a uma nota fiscal",
              "NFE_SALE_ALREADY_LINKED",
            );
          }
        }

        let chave = links
          ? accessKeyWithInvoiceNumber(input.chave, nNf)
          : input.chave;
        let serie = input.serie;
        if (ownSerie !== undefined) {
          serie = ownSerie;
          chave = accessKeyWithSerie(chave, serie);
        }

        const [row] = await tx
          .insert(nfeHeaders)
          .values({
            enterpriseId,
            issuanceType,
            destMemberId: links?.destMemberId,
            moviments: input.moviments,
            status: "PENDENTE",
            chave,
            cUf: input.cUf,
            cNf: input.cNf,
            versao: "4.00",
            natOp: input.natOp,
            mod: input.mod,
            serie,
            nNf,
            dhEmi: new Date(input.dhEmi),
            tpNf: input.tpNf,
            idDest: input.idDest,
            cMunFg: input.cMunFg,
            tpImp: input.tpImp,
            tpEmis: input.tpEmis,
            cDv: emission || links ? chave.slice(43) : input.cDv,
            tpAmb,
            finNfe: input.finNfe,
            indFinal: input.indFinal,
            indPres: input.indPres,
            procEmi: input.procEmi ?? "0",
            verProc: input.verProc ?? "gescom",
            infCpl: input.infCpl,
            ...headerTotals(prepared.totals),
            ...emitParty(input.emit),
            ...destParty(input.dest),
          })
          .returning();
        if (!row) {
          throw new Error("Falha ao criar nota fiscal");
        }

        for (const entry of prepared.items) {
          const item = entry.item;
          const tax = item.tax;
          const [created] = await tx
            .insert(nfeItems)
            .values({
              nfeHeaderId: row.id,
              productsEnterprisesId: item.productsEnterprisesId,
              nItem: item.nItem,
              cProd: item.cProd,
              cEan: item.cEan,
              xProd: item.xProd,
              ncm: item.ncm,
              cBenef: item.cBenef,
              cfop: item.cfop,
              uCom: item.uCom,
              qCom: rate(item.qCom),
              vUnCom: rate(item.vUnCom, 10),
              vProd: money(item.vProd),
              uTrib: item.uTrib,
              qTrib: rate(item.qTrib),
              vUnTrib: rate(item.vUnTrib, 10),
              vFrete: money(item.vFrete),
              vSeg: money(item.vSeg),
              vDesc: money(item.vDesc),
              vOutro: money(item.vOutro),
              indTot: item.indTot ?? "1",
              infAdProd: infAdProdText(item.infAdProd) ?? null,
            })
            .returning();
          if (!created) {
            throw new Error("Falha ao gravar item da nota");
          }
          await tx.insert(nfeItemTaxes).values({
            nfeItemId: created.id,
            icmsOrig: tax?.icmsOrig,
            icmsCst: tax?.icmsCst,
            icmsCsosn: tax?.icmsCsosn,
            icmsModBc: tax?.icmsModBc ?? "3",
            icmsPIcms: rate(tax?.pIcms),
            icmsPFcp: rate(tax?.pFcp),
            icmsPRedBc: rate(tax?.pRedBc),
            icmsMotDesIcms: tax?.motDesIcms,
            icmsIndDeduzDeson: tax?.indDeduzDeson,
            icmsPMvaSt: rate(tax?.pMvaSt),
            icmsPRedBcSt: rate(tax?.pRedBcSt),
            icmsPIcmsSt: rate(tax?.pIcmsSt),
            icmsPIcmsUfDest: rate(tax?.pIcmsUfDest),
            icmsPIcmsInter: rate(tax?.pIcmsInter),
            icmsPIcmsInterPart: rate(tax?.pIcmsInterPart),
            icmsPFcpUfDest: rate(tax?.pFcpUfDest),
            icmsQBcMono: rate(tax?.qBcMono),
            icmsAdRemIcms: rate(tax?.adRemIcms),
            ipiCst: tax?.ipiCst,
            ipiPIpi: rate(tax?.pIpi),
            ipiQUnid: rate(tax?.qUnidIpi),
            ipiVUnid: rate(tax?.vUnidIpi),
            pisCst: tax?.pisCst,
            pisPPis: rate(tax?.pPis),
            pisQBcProd: rate(tax?.qBcProdPis),
            pisVAliqProd: rate(tax?.vAliqProdPis),
            cofinsCst: tax?.cofinsCst,
            cofinsPCofins: rate(tax?.pCofins),
            cofinsQBcProd: rate(tax?.qBcProdCofins),
            cofinsVAliqProd: rate(tax?.vAliqProdCofins),
            issqnVAliq: rate(tax?.pIssqn),
            isPIs: rate(tax?.pIs),
            ibsUfPIbs: rate(tax?.pIbsUf),
            ibsUfPRedAliq: rate(tax?.pRedIbsUf) ?? entry.classRedIbs,
            ibsMunPIbs: rate(tax?.pIbsMun),
            ibsMunPRedAliq: rate(tax?.pRedIbsMun) ?? entry.classRedIbs,
            cbsPCbs: rate(tax?.pCbs),
            cbsPRedAliq: rate(tax?.pRedCbs) ?? entry.classRedCbs,
            ibsCbsCst: entry.classCst,
            ibsCbsCClassTrib: entry.classTrib,
            ...calculatedTaxValues(entry.result),
          });
        }

        if (links?.saleIds.length) {
          await tx.insert(nfeSales).values(
            links.saleIds.map((salesId) => ({
              nfeHeaderId: row.id,
              salesId,
            })),
          );
        }

        await tx.insert(nfePayments).values(
          input.payments.map((payment) => ({
            nfeHeaderId: row.id,
            paymentTypeId: payment.paymentTypeId,
            paymentTypesMethodsFlagsId: payment.paymentTypesMethodsFlagsId ?? null,
            nSeq: payment.nSeq,
            indPag: payment.indPag,
            tPag: payment.tPag,
            xPag: payment.xPag,
            vPag: money(payment.vPag),
            cardTpIntegra: payment.cardTpIntegra,
            cardCnpj: payment.cardCnpj,
            cardTBand: payment.cardTBand,
            cardCAut: payment.cardCAut,
          })),
        );

        await recordCreateAudit({
          entityType: EntityTypes.NFE_HEADERS,
          entityId: row.id,
          after: row,
          ctx: { ...audit, enterpriseId },
          tx,
        });
        return row.id;
      });
      return this.get(enterpriseId, createdId);
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Nota fiscal em conflito (chave duplicada)",
          "NFE_CONFLICT",
        );
      }
      throw err;
    }
  }

  private listWhere(enterpriseId: string, query: ListNfeQuery) {
    const filters = [
      eq(nfeHeaders.enterpriseId, enterpriseId),
      isNull(nfeHeaders.deletedAt),
    ];
    if (query.mod) filters.push(eq(nfeHeaders.mod, query.mod));
    if (query.status) filters.push(eq(nfeHeaders.status, query.status));
    if (query.from) filters.push(gte(nfeHeaders.dhEmi, query.from));
    if (query.to) filters.push(lte(nfeHeaders.dhEmi, query.to));
    const term = query.search?.trim();
    if (term) {
      const parts = [
        ilike(nfeHeaders.destXNome, `%${term}%`),
        ilike(nfeHeaders.emitXNome, `%${term}%`),
        ilike(nfeHeaders.natOp, `%${term}%`),
        ilike(nfeHeaders.chave, `%${term.replace(/\D/g, "") || term}%`),
      ];
      if (/^\d{1,9}$/.test(term)) parts.push(eq(nfeHeaders.nNf, Number(term)));
      filters.push(or(...parts)!);
    }
    return and(...filters);
  }

  /** Totais de todas as notas do filtro da listagem (sem paginação). */
  public async summary(enterpriseId: string, query: ListNfeQuery = {}) {
    const total = (column: AnyColumn) => sql<string>`coalesce(sum(${column}), 0)`;
    const [row] = await db
      .select({
        count: count(),
        vProd: total(nfeHeaders.vProd),
        vFrete: total(nfeHeaders.vFrete),
        vSeg: total(nfeHeaders.vSeg),
        vOutro: total(nfeHeaders.vOutro),
        vDesc: total(nfeHeaders.vDesc),
        vIcms: total(nfeHeaders.vIcms),
        vPis: total(nfeHeaders.vPis),
        vCofins: total(nfeHeaders.vCofins),
        vIpi: total(nfeHeaders.vIpi),
        vCbs: total(nfeHeaders.vCbs),
        vIbs: total(nfeHeaders.vIbs),
        vNf: total(nfeHeaders.vNf),
      })
      .from(nfeHeaders)
      .where(this.listWhere(enterpriseId, query));
    const money = (value: string | undefined) => Math.round(Number(value ?? 0) * 100) / 100;
    return {
      count: Number(row?.count ?? 0),
      vProd: money(row?.vProd),
      vFrete: money(row?.vFrete),
      vSeg: money(row?.vSeg),
      vOutro: money(row?.vOutro),
      vDesc: money(row?.vDesc),
      vIcms: money(row?.vIcms),
      vPis: money(row?.vPis),
      vCofins: money(row?.vCofins),
      vIpi: money(row?.vIpi),
      vCbs: money(row?.vCbs),
      vIbs: money(row?.vIbs),
      vNf: money(row?.vNf),
    };
  }

  public async list(enterpriseId: string, query: ListNfeQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.listWhere(enterpriseId, query);
    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: nfeHeaders.id,
          chave: nfeHeaders.chave,
          mod: nfeHeaders.mod,
          serie: nfeHeaders.serie,
          nNf: nfeHeaders.nNf,
          dhEmi: nfeHeaders.dhEmi,
          dhRecbto: nfeHeaders.dhRecbto,
          natOp: nfeHeaders.natOp,
          status: nfeHeaders.status,
          destXNome: nfeHeaders.destXNome,
          emitXNome: nfeHeaders.emitXNome,
          vNf: nfeHeaders.vNf,
          cStat: nfeHeaders.cStat,
          xMotivo: nfeHeaders.xMotivo,
        })
        .from(nfeHeaders)
        .where(where)
        .orderBy(desc(nfeHeaders.dhEmi), desc(nfeHeaders.nNf))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(nfeHeaders).where(where),
    ]);
    return {
      items,
      total: Number(totalRows[0]?.c ?? 0),
      limit,
      offset,
    };
  }

  public async get(enterpriseId: string, nfeId: string) {
    const header = await this.loadHeader(enterpriseId, nfeId);
    const [items, payments, transport, linkedSales, duplicates] = await Promise.all([
      db
        .select()
        .from(nfeItems)
        .where(eq(nfeItems.nfeHeaderId, nfeId))
        .orderBy(asc(nfeItems.nItem)),
      db
        .select({
          id: nfePayments.id,
          nfeHeaderId: nfePayments.nfeHeaderId,
          paymentTypeId: nfePayments.paymentTypeId,
          paymentTypesMethodsFlagsId: nfePayments.paymentTypesMethodsFlagsId,
          nSeq: nfePayments.nSeq,
          indPag: nfePayments.indPag,
          tPag: nfePayments.tPag,
          xPag: nfePayments.xPag,
          vPag: nfePayments.vPag,
          cardTpIntegra: nfePayments.cardTpIntegra,
          cardCnpj: nfePayments.cardCnpj,
          cardTBand: nfePayments.cardTBand,
          cardCAut: nfePayments.cardCAut,
          paymentDescription: paymentTypes.description,
        })
        .from(nfePayments)
        .leftJoin(paymentTypes, eq(paymentTypes.id, nfePayments.paymentTypeId))
        .where(eq(nfePayments.nfeHeaderId, nfeId))
        .orderBy(asc(nfePayments.nSeq)),
      db
        .select()
        .from(nfeTransports)
        .where(eq(nfeTransports.nfeHeaderId, nfeId))
        .limit(1),
      db
        .select({
          salesId: nfeSales.salesId,
          orderNumber: sales.orderNumber,
        })
        .from(nfeSales)
        .innerJoin(sales, eq(sales.id, nfeSales.salesId))
        .where(and(eq(nfeSales.nfeHeaderId, nfeId), isNull(nfeSales.deletedAt)))
        .orderBy(asc(sales.orderNumber)),
      db
        .select({
          id: nfeDuplicates.id,
          nDup: nfeDuplicates.nDup,
          dVenc: nfeDuplicates.dVenc,
          vDup: nfeDuplicates.vDup,
        })
        .from(nfeDuplicates)
        .where(eq(nfeDuplicates.nfeHeaderId, nfeId))
        .orderBy(asc(nfeDuplicates.nDup)),
    ]);
    const taxes = items.length
      ? await db
          .select()
          .from(nfeItemTaxes)
          .where(
            inArray(
              nfeItemTaxes.nfeItemId,
              items.map((item) => item.id),
            ),
          )
      : [];
    const taxByItem = new Map(taxes.map((tax) => [tax.nfeItemId, tax]));
    const transportRow = transport[0];
    const volumes = transportRow
      ? await db
          .select()
          .from(nfeTransportVolumes)
          .where(eq(nfeTransportVolumes.nfeTransportId, transportRow.id))
          .orderBy(asc(nfeTransportVolumes.nSeq))
      : [];
    const paymentCatalog = await loadPaymentConfigCatalog(
      enterpriseId,
      payments.flatMap((payment) =>
        payment.paymentTypesMethodsFlagsId ? [payment.paymentTypesMethodsFlagsId] : [],
      ),
    );
    return {
      ...header,
      items: items.map((item) => ({
        ...item,
        tax: taxByItem.get(item.id) ?? null,
      })),
      payments: payments.map((payment) => {
        const config = payment.paymentTypesMethodsFlagsId
          ? paymentCatalog.get(payment.paymentTypesMethodsFlagsId)
          : undefined;
        return {
          ...payment,
          paymentCode: config?.paymentCode ?? null,
          paymentIntegration: config?.integration ?? null,
          flagCode: config?.flagCode ?? null,
          flagDescription: config?.flagDescription ?? null,
          paymentConfigCnpj: config?.cnpj ?? null,
        };
      }),
      transport: transportRow ? { ...transportRow, volumes } : null,
      sales: linkedSales,
      duplicates,
    };
  }

  public async patch(
    enterpriseId: string,
    nfeId: string,
    input: PatchNfeInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.loadDraft(enterpriseId, nfeId);
    const issuanceType = input.issuanceType ?? existing.issuanceType;
    const { emit, dest, dhEmi, dhSaiEnt, nNf, nfeOperationsId: _operation, ...rest } = input;
    const exitDate = dhSaiEnt ? new Date(dhSaiEnt) : null;
    if (exitDate && Number.isNaN(exitDate.getTime())) {
      throw new BadRequestError("Data de saida invalida", "NFE_EXIT_DATE_INVALID");
    }
    const [row] = await db
      .update(nfeHeaders)
      .set({
        ...rest,
        ...(issuanceType === "TERCEIRO" && nNf !== undefined ? { nNf } : {}),
        ...(dhEmi !== undefined ? { dhEmi: new Date(dhEmi) } : {}),
        ...(dhSaiEnt !== undefined ? { dhSaiEnt: exitDate } : {}),
        ...emitParty(emit),
        ...destParty(dest),
        updatedAt: new Date(),
      })
      .where(eq(nfeHeaders.id, nfeId))
      .returning();
    if (!row) {
      throw new NotFoundError("Nota fiscal nao encontrada", "NFE_NOT_FOUND");
    }
    await recordEntityAudit({
      entityType: EntityTypes.NFE_HEADERS,
      entityId: nfeId,
      action: "UPDATE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: { ...audit, enterpriseId },
    });
    return row;
  }

  public async replaceItems(
    enterpriseId: string,
    nfeId: string,
    input: ReplaceNfeItemsInput,
    audit: EntityAuditContext,
  ) {
    await this.loadDraft(enterpriseId, nfeId);
    const before = await this.get(enterpriseId, nfeId);
    const productIds = [
      ...new Set(input.items.map((item) => item.productsEnterprisesId)),
    ];
    const typedProducts = await db
      .select({
        id: productsEnterprises.id,
        type: productTypes.type,
      })
      .from(productsEnterprises)
      .innerJoin(
        productTypes,
        eq(productTypes.id, productsEnterprises.productTypeId),
      )
      .where(
        and(
          eq(productsEnterprises.enterprisesId, enterpriseId),
          inArray(productsEnterprises.id, productIds),
        ),
      );
    const serviceProductIds = new Set(
      typedProducts
        .filter((product) => product.type === PRODUCT_TYPE_SERVICE_CODE)
        .map((product) => product.id),
    );
    const billableItems = input.items
      .filter((item) => !serviceProductIds.has(item.productsEnterprisesId))
      .map((item, index) => ({ ...item, nItem: index + 1 }));
    if (billableItems.length === 0) {
      throw new BadRequestError(
        "Nota fiscal sem itens de mercadoria para gravar",
        "NFE_ITEMS_REQUIRED",
      );
    }
    await db.transaction(async (tx) => {
      await tx.delete(nfeItems).where(eq(nfeItems.nfeHeaderId, nfeId));
      for (const item of billableItems) {
        const product = await tx
          .select({ id: productsEnterprises.id })
          .from(productsEnterprises)
          .where(
            and(
              eq(productsEnterprises.id, item.productsEnterprisesId),
              eq(productsEnterprises.enterprisesId, enterpriseId),
            ),
          )
          .limit(1);
        if (!product[0]) {
          throw new NotFoundError(
            "Produto da empresa nao encontrado",
            "PRODUCT_ENTERPRISE_NOT_FOUND",
          );
        }
        const [created] = await tx
          .insert(nfeItems)
          .values({
            nfeHeaderId: nfeId,
            productsEnterprisesId: item.productsEnterprisesId,
            nItem: item.nItem,
            cProd: item.cProd,
            cEan: item.cEan,
            xProd: item.xProd,
            ncm: item.ncm,
            cBenef: item.cBenef,
            cfop: item.cfop,
            uCom: item.uCom,
            qCom: rate(item.qCom),
            vUnCom: rate(item.vUnCom, 10),
            vProd: money(item.vProd),
            uTrib: item.uTrib,
            qTrib: rate(item.qTrib),
            vUnTrib: rate(item.vUnTrib, 10),
            vFrete: money(item.vFrete),
            vSeg: money(item.vSeg),
            vDesc: money(item.vDesc),
            vOutro: money(item.vOutro),
            indTot: item.indTot ?? "1",
            infAdProd: infAdProdText(item.infAdProd) ?? null,
          })
          .returning();
        if (!created) {
          throw new Error("Falha ao gravar item da nota");
        }
        const tax = item.tax;
        let classTrib: string | undefined;
        let classCst: string | undefined;
        let classRedIbs: string | null = null;
        let classRedCbs: string | null = null;
        if (tax?.classificationIbsCbsId) {
          const [classification] = await tx
            .select({
              cClassTrib: classificationIbsCbs.cClassTrib,
              pRedIbs: classificationIbsCbs.pRedIbs,
              pRedCbs: classificationIbsCbs.pRedCbs,
              cst: cstIbsCbs.cst,
            })
            .from(classificationIbsCbs)
            .innerJoin(cstIbsCbs, eq(cstIbsCbs.id, classificationIbsCbs.cstIbsCbsId))
            .where(eq(classificationIbsCbs.id, tax.classificationIbsCbsId))
            .limit(1);
          if (!classification) {
            throw new NotFoundError(
              "Classificacao IBS/CBS nao encontrada",
              "CLASSIFICATION_IBS_CBS_NOT_FOUND",
            );
          }
          classTrib = classification.cClassTrib;
          classCst = classification.cst;
          classRedIbs = classification.pRedIbs;
          classRedCbs = classification.pRedCbs;
        }
        await tx.insert(nfeItemTaxes).values({
          nfeItemId: created.id,
          icmsOrig: tax?.icmsOrig,
          icmsCst: tax?.icmsCst,
          icmsCsosn: tax?.icmsCsosn,
          icmsModBc: tax?.icmsModBc ?? "3",
          icmsPIcms: rate(tax?.pIcms),
          icmsPFcp: rate(tax?.pFcp),
          icmsPRedBc: rate(tax?.pRedBc),
          icmsMotDesIcms: tax?.motDesIcms,
          icmsIndDeduzDeson: tax?.indDeduzDeson,
          icmsPMvaSt: rate(tax?.pMvaSt),
          icmsPRedBcSt: rate(tax?.pRedBcSt),
          icmsPIcmsSt: rate(tax?.pIcmsSt),
          icmsPIcmsUfDest: rate(tax?.pIcmsUfDest),
          icmsPIcmsInter: rate(tax?.pIcmsInter),
          icmsPIcmsInterPart: rate(tax?.pIcmsInterPart),
          icmsPFcpUfDest: rate(tax?.pFcpUfDest),
          icmsQBcMono: rate(tax?.qBcMono),
          icmsAdRemIcms: rate(tax?.adRemIcms),
          ipiCst: tax?.ipiCst,
          ipiPIpi: rate(tax?.pIpi),
          ipiQUnid: rate(tax?.qUnidIpi),
          ipiVUnid: rate(tax?.vUnidIpi),
          pisCst: tax?.pisCst,
          pisPPis: rate(tax?.pPis),
          pisQBcProd: rate(tax?.qBcProdPis),
          pisVAliqProd: rate(tax?.vAliqProdPis),
          cofinsCst: tax?.cofinsCst,
          cofinsPCofins: rate(tax?.pCofins),
          cofinsQBcProd: rate(tax?.qBcProdCofins),
          cofinsVAliqProd: rate(tax?.vAliqProdCofins),
          issqnVAliq: rate(tax?.pIssqn),
          issqnVBc: money(tax?.vBcIssqn),
          isPIs: rate(tax?.pIs),
          isVBc: money(tax?.vBcIs),
          ibsCbsVBc: money(tax?.vBcIbsCbs),
          ibsUfPIbs: rate(tax?.pIbsUf),
          ibsUfPRedAliq: rate(tax?.pRedIbsUf) ?? classRedIbs,
          ibsMunPIbs: rate(tax?.pIbsMun),
          ibsMunPRedAliq: rate(tax?.pRedIbsMun) ?? classRedIbs,
          cbsPCbs: rate(tax?.pCbs),
          cbsPRedAliq: rate(tax?.pRedCbs) ?? classRedCbs,
          ibsCbsCst: classCst,
          ibsCbsCClassTrib: classTrib,
        });
      }
    });
    return this.auditDocumentChange(enterpriseId, nfeId, before, audit);
  }

  public async replacePayments(
    enterpriseId: string,
    nfeId: string,
    input: ReplaceNfePaymentsInput,
    audit: EntityAuditContext,
  ) {
    await this.loadDraft(enterpriseId, nfeId);
    await assertPaymentConfigsMatch(enterpriseId, input.payments);
    const before = await this.get(enterpriseId, nfeId);
    await db.transaction(async (tx) => {
      await tx.delete(nfePayments).where(eq(nfePayments.nfeHeaderId, nfeId));
      if (input.payments.length === 0) return;
      await tx.insert(nfePayments).values(
        input.payments.map((payment) => ({
          nfeHeaderId: nfeId,
          paymentTypeId: payment.paymentTypeId,
          paymentTypesMethodsFlagsId: payment.paymentTypesMethodsFlagsId ?? null,
          nSeq: payment.nSeq,
          indPag: payment.indPag,
          tPag: payment.tPag,
          xPag: payment.xPag,
          vPag: money(payment.vPag),
          cardTpIntegra: payment.cardTpIntegra,
          cardCnpj: payment.cardCnpj,
          cardTBand: payment.cardTBand,
          cardCAut: payment.cardCAut,
        })),
      );
    });
    return this.auditDocumentChange(enterpriseId, nfeId, before, audit);
  }

  public async replaceDuplicates(
    enterpriseId: string,
    nfeId: string,
    input: ReplaceNfeDuplicatesInput,
    audit: EntityAuditContext,
  ) {
    const header = await this.loadDraft(enterpriseId, nfeId);
    const duplicates = input.duplicates;
    if (duplicates.length && header.mod === "65") {
      throw new BadRequestError("NFC-e nao aceita fatura nem duplicatas", "NFE_DUPLICATES_NFCE");
    }
    const cents = (value: number) => Math.round(value * 100);
    if (duplicates.length) {
      const total = duplicates.reduce((sum, row) => sum + cents(row.vDup), 0);
      if (total !== cents(input.vLiq)) {
        throw new BadRequestError(
          "A soma das duplicatas precisa ser igual ao valor liquido da fatura",
          "NFE_DUPLICATES_TOTAL",
        );
      }
      if (cents(input.vOrig) - cents(input.vDesc) !== cents(input.vLiq)) {
        throw new BadRequestError(
          "Valor liquido da fatura deve ser o original menos o desconto",
          "NFE_INVOICE_NET",
        );
      }
      const issued = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(
        header.dhEmi ?? new Date(),
      );
      let previous = "";
      for (const row of duplicates) {
        if (Number.isNaN(new Date(`${row.dVenc}T00:00:00Z`).getTime())) {
          throw new BadRequestError("Vencimento invalido", "NFE_DUPLICATE_DATE_INVALID");
        }
        if (row.dVenc < issued) {
          throw new BadRequestError(
            "Vencimento da duplicata nao pode ser anterior a emissao da nota",
            "NFE_DUPLICATE_DATE_BEFORE_ISSUE",
          );
        }
        if (row.dVenc < previous) {
          throw new BadRequestError(
            "Vencimentos das duplicatas devem estar em ordem crescente",
            "NFE_DUPLICATE_DATE_ORDER",
          );
        }
        previous = row.dVenc;
      }
    }
    const before = await this.get(enterpriseId, nfeId);
    await db.transaction(async (tx) => {
      await tx.delete(nfeDuplicates).where(eq(nfeDuplicates.nfeHeaderId, nfeId));
      if (duplicates.length) {
        await tx.insert(nfeDuplicates).values(
          duplicates.map((row, index) => ({
            nfeHeaderId: nfeId,
            nDup: String(index + 1).padStart(3, "0"),
            dVenc: row.dVenc,
            vDup: money(row.vDup)!,
          })),
        );
      }
      await tx
        .update(nfeHeaders)
        .set(
          duplicates.length
            ? {
                nFat: input.nFat || (header.nNf == null ? null : String(header.nNf)),
                vOrig: money(input.vOrig),
                cobrVDesc: money(input.vDesc),
                vLiq: money(input.vLiq),
                updatedAt: new Date(),
              }
            : { nFat: null, vOrig: null, cobrVDesc: null, vLiq: null, updatedAt: new Date() },
        )
        .where(eq(nfeHeaders.id, nfeId));
    });
    return this.auditDocumentChange(enterpriseId, nfeId, before, audit);
  }

  public async replaceTransport(
    enterpriseId: string,
    nfeId: string,
    input: ReplaceNfeTransportInput,
    audit: EntityAuditContext,
  ) {
    const header = await this.loadDraft(enterpriseId, nfeId);
    if (header.mod === "65" && input.modFrete !== "9") {
      throw new BadRequestError(
        "NFC-e deve usar frete 9 - sem transporte",
        "NFE_TRANSPORT_NFCE",
      );
    }
    const before = await this.get(enterpriseId, nfeId);
    const volumes = input.volumes.filter((volume) =>
      Object.values(volume).some((value) => value !== undefined && value !== ""),
    );
    await db.transaction(async (tx) => {
      await tx.delete(nfeTransports).where(eq(nfeTransports.nfeHeaderId, nfeId));
      const [transport] = await tx
        .insert(nfeTransports)
        .values({
          nfeHeaderId: nfeId,
          modFrete: input.modFrete,
          transpCnpj: input.cnpj ?? null,
          transpCpf: input.cpf ?? null,
          transpXNome: input.xNome || null,
          transpIe: input.ie ?? null,
          transpXEnder: input.xEnder || null,
          transpXMun: input.xMun || null,
          transpUf: input.uf ?? null,
          veicPlaca: input.veicPlaca ?? null,
          veicUf: input.veicUf ?? null,
          veicRntc: input.veicRntc || null,
        })
        .returning({ id: nfeTransports.id });
      if (!transport) throw new Error("Falha ao gravar transporte da nota");
      if (volumes.length) {
        await tx.insert(nfeTransportVolumes).values(
          volumes.map((volume, index) => ({
            nfeTransportId: transport.id,
            nSeq: index + 1,
            qVol: volume.qVol ?? null,
            esp: volume.esp || null,
            marca: volume.marca || null,
            nVol: volume.nVol || null,
            pesoL: volume.pesoL === undefined ? null : volume.pesoL.toFixed(3),
            pesoB: volume.pesoB === undefined ? null : volume.pesoB.toFixed(3),
          })),
        );
      }
    });
    return this.auditDocumentChange(enterpriseId, nfeId, before, audit);
  }

  public async recalculateItems(
    enterpriseId: string,
    nfeId: string,
    input: RecalculateNfeItemsInput,
    audit: EntityAuditContext,
  ) {
    const header = await this.loadDraft(enterpriseId, nfeId);
    if (header.mod !== "55" && header.mod !== "65") {
      throw new BadRequestError("Modelo da nota fiscal invalido", "NFE_MODEL_INVALID");
    }
    const currentItems = await db
      .select()
      .from(nfeItems)
      .where(eq(nfeItems.nfeHeaderId, nfeId))
      .orderBy(asc(nfeItems.nItem));
    const [chosenOperation] = input.nfeOperationsId
      ? await db
          .select({ id: nfeOperations.id, description: nfeOperations.description })
          .from(nfeOperations)
          .where(and(eq(nfeOperations.id, input.nfeOperationsId), eq(nfeOperations.status, true)))
          .limit(1)
      : header.natOp?.trim()
        ? await db
            .select({ id: nfeOperations.id, description: nfeOperations.description })
            .from(nfeOperations)
            .where(and(eq(nfeOperations.description, header.natOp.trim()), eq(nfeOperations.status, true)))
            .limit(1)
        : [];
    if (input.nfeOperationsId && !chosenOperation) {
      throw new NotFoundError("Operacao fiscal nao encontrada", "NFE_OPERATION_NOT_FOUND");
    }
    const natOp = input.nfeOperationsId && chosenOperation
      ? chosenOperation.description.slice(0, 60)
      : header.natOp ?? undefined;
    const productIds = [...new Set(input.items.map((item) => item.productsEnterprisesId))];
    const productRows = await db
      .select({
        id: productsEnterprises.id,
        code: productsEnterprises.code,
        description: productsEnterprises.description,
        additionalProduct: productsEnterprises.additionalProduct,
        barCode: products.barCode,
        ncm: productsNcm.ncm,
        unit: measurementUnits.unit,
        type: productTypes.type,
        price: prices.price,
      })
      .from(productsEnterprises)
      .innerJoin(products, eq(products.id, productsEnterprises.productId))
      .innerJoin(productTypes, eq(productTypes.id, productsEnterprises.productTypeId))
      .innerJoin(measurementUnits, eq(measurementUnits.id, productsEnterprises.measurementUnitId))
      .leftJoin(productsNcm, eq(productsNcm.id, productsEnterprises.productNcmId))
      .leftJoin(prices, eq(prices.productsEnterprisesId, productsEnterprises.id))
      .where(
        and(
          eq(productsEnterprises.enterprisesId, enterpriseId),
          inArray(productsEnterprises.id, productIds),
        ),
      );
    const productById = new Map(productRows.map((row) => [row.id, row]));
    const digits = (value: string | null | undefined) => (value ?? "").replace(/\D/g, "");
    const amount = (value: number | undefined) =>
      value !== undefined && value > 0 ? Math.round(value * 100) / 100 : undefined;
    const items = input.items.map((item, index) => {
      const product = productById.get(item.productsEnterprisesId);
      if (!product) {
        throw new NotFoundError(
          "Produto da empresa nao encontrado",
          "PRODUCT_ENTERPRISE_NOT_FOUND",
        );
      }
      if (product.type === PRODUCT_TYPE_SERVICE_CODE) {
        throw new BadRequestError(
          "Produto de servico nao pode substituir item da nota",
          "NFE_ITEM_SERVICE",
        );
      }
      const current = currentItems[index];
      const sameProduct = current?.productsEnterprisesId === item.productsEnterprisesId;
      const catalogPrice = product.price == null || product.price === "" ? NaN : Number(product.price);
      const currentUnit = sameProduct ? Number(current?.vUnCom ?? NaN) : NaN;
      const unit = item.vUnCom
        ?? (Number.isFinite(catalogPrice) && catalogPrice > 0
          ? catalogPrice
          : Number.isFinite(currentUnit) && currentUnit > 0 ? currentUnit : NaN);
      if (!Number.isFinite(unit) || unit <= 0) {
        throw new BadRequestError(
          `Informe o valor unitario do item ${index + 1} (${product.description})`,
          "NFE_ITEM_PRICE_REQUIRED",
        );
      }
      const quantity = item.qCom;
      const gross = Math.round(quantity * unit * 100) / 100;
      if ((item.vDesc ?? 0) > gross) {
        throw new BadRequestError(
          `O desconto do item ${index + 1} e maior que o valor do produto`,
          "NFE_ITEM_DISCOUNT",
        );
      }
      const ncm = digits(product.ncm).slice(0, 8);
      const ean = digits(product.barCode);
      const description = product.description.trim().slice(0, 120) || "PRODUTO";
      return {
        productsEnterprisesId: item.productsEnterprisesId,
        nItem: index + 1,
        cProd: product.code == null ? undefined : String(product.code).slice(0, 60),
        cEan: isValidGtin(ean) ? ean : undefined,
        xProd: description,
        ncm: ncm.length > 0 ? ncm : undefined,
        uCom: (product.unit || "UN").slice(0, 6),
        qCom: quantity,
        vUnCom: unit,
        vProd: gross,
        uTrib: (product.unit || "UN").slice(0, 6),
        qTrib: quantity,
        vUnTrib: unit,
        vFrete: amount(item.vFrete),
        vSeg: amount(item.vSeg),
        vDesc: amount(item.vDesc),
        vOutro: amount(item.vOutro),
        indTot: current?.indTot ?? "1",
        infAdProd: infAdProdText(product.additionalProduct),
      };
    });
    const filled = await applyStateOperationToNote(
      enterpriseId,
      {
        chave: header.chave,
        cUf: header.cUf,
        cNf: header.cNf,
        natOp,
        nfeOperationsId: chosenOperation?.id,
        mod: header.mod,
        serie: header.serie,
        nNf: header.nNf,
        dhEmi: header.dhEmi.toISOString(),
        tpNf: header.tpNf ?? undefined,
        cMunFg: header.cMunFg,
        tpImp: header.tpImp ?? undefined,
        tpEmis: header.tpEmis,
        cDv: header.cDv ?? undefined,
        tpAmb: header.tpAmb === 1 ? 1 : 2,
        finNfe: header.finNfe ?? undefined,
        indFinal: header.indFinal ?? undefined,
        indPres: header.indPres ?? undefined,
        procEmi: header.procEmi ?? undefined,
        verProc: header.verProc ?? undefined,
        moviments: header.moviments,
        issuanceType: header.issuanceType,
        dest: {
          uf: header.destUf ?? undefined,
          cmun: header.destCmun ?? undefined,
          indIeDest: header.destIndIeDest ?? undefined,
          isuf: header.destIsuf ?? undefined,
        },
        items,
        payments: [],
      },
      header.destMemberId ?? undefined,
    );
    if (filled.natOp !== header.natOp || filled.idDest !== header.idDest) {
      await db
        .update(nfeHeaders)
        .set({ natOp: filled.natOp ?? header.natOp, idDest: filled.idDest ?? header.idDest, updatedAt: new Date() })
        .where(eq(nfeHeaders.id, nfeId));
    }
    await this.replaceItems(enterpriseId, nfeId, { items: filled.items }, audit);
    const calculated = await this.calculate(enterpriseId, nfeId, audit);
    const payments = calculated.payments ?? [];
    const total = Number(calculated.vNf ?? 0);
    const payment = payments.length === 1 ? payments[0] : undefined;
    if (!payment?.paymentTypeId || !(total > 0) || Number(payment.vPag ?? 0) === total) {
      return calculated;
    }
    const textOrUndefined = (value: string | null | undefined) => {
      const text = value?.trim();
      return text ? text : undefined;
    };
    return this.replacePayments(
      enterpriseId,
      nfeId,
      {
        payments: [{
          paymentTypeId: payment.paymentTypeId,
          paymentTypesMethodsFlagsId: payment.paymentTypesMethodsFlagsId,
          nSeq: payment.nSeq || 1,
          indPag: textOrUndefined(payment.indPag),
          tPag: textOrUndefined(payment.tPag),
          xPag: textOrUndefined(payment.xPag),
          vPag: total,
          cardTpIntegra: textOrUndefined(payment.cardTpIntegra),
          cardCnpj: textOrUndefined(payment.cardCnpj),
          cardTBand: textOrUndefined(payment.cardTBand),
          cardCAut: textOrUndefined(payment.cardCAut),
        }],
      },
      audit,
    );
  }

  public async calculate(
    enterpriseId: string,
    nfeId: string,
    audit: EntityAuditContext,
  ) {
    const header = await this.loadDraft(enterpriseId, nfeId);
    const before = await this.get(enterpriseId, nfeId);
    const items = await db
      .select()
      .from(nfeItems)
      .where(eq(nfeItems.nfeHeaderId, nfeId))
      .orderBy(asc(nfeItems.nItem));
    const taxes = items.length
      ? await db
          .select()
          .from(nfeItemTaxes)
          .where(
            inArray(
              nfeItemTaxes.nfeItemId,
              items.map((item) => item.id),
            ),
          )
      : [];
    const destUf = header.destUf?.trim().toUpperCase();
    const [destState] = destUf
      ? await db
          .select({ difalCalculation: states.difalCalculation })
          .from(states)
          .where(and(eq(states.acronym, destUf), isNull(states.deletedAt)))
          .limit(1)
      : [];
    const difalCalculation = destState?.difalCalculation;
    const calculated = items.map((item) => {
      const tax = taxes.find((row) => row.nfeItemId === item.id);
      const rates: TaxRateInput = {
        icmsCst: tax?.icmsCst,
        indDeduzDeson: tax?.icmsIndDeduzDeson,
        pIcms: tax?.icmsPIcms,
        pFcp: tax?.icmsPFcp,
        pRedBc: tax?.icmsPRedBc,
        pMvaSt: tax?.icmsPMvaSt,
        pRedBcSt: tax?.icmsPRedBcSt,
        pIcmsSt: tax?.icmsPIcmsSt,
        pIcmsUfDest: tax?.icmsPIcmsUfDest,
        pIcmsInter: tax?.icmsPIcmsInter,
        pIcmsInterPart: tax?.icmsPIcmsInterPart,
        pFcpUfDest: tax?.icmsPFcpUfDest,
        difalCalculation,
        qBcMono: tax?.icmsQBcMono,
        adRemIcms: tax?.icmsAdRemIcms,
        pIpi: tax?.ipiPIpi,
        qUnidIpi: tax?.ipiQUnid,
        vUnidIpi: tax?.ipiVUnid,
        pPis: tax?.pisPPis,
        qBcProdPis: tax?.pisQBcProd,
        vAliqProdPis: tax?.pisVAliqProd,
        pCofins: tax?.cofinsPCofins,
        qBcProdCofins: tax?.cofinsQBcProd,
        vAliqProdCofins: tax?.cofinsVAliqProd,
        pIssqn: tax?.issqnVAliq,
        vBcIssqn: tax?.issqnVBc,
        pIs: tax?.isPIs,
        vBcIs: tax?.isVBc,
        vBcIbsCbs: tax?.ibsCbsVBc,
        pIbsUf: tax?.ibsUfPIbs,
        pRedIbsUf: tax?.ibsUfPRedAliq,
        pIbsMun: tax?.ibsMunPIbs,
        pRedIbsMun: tax?.ibsMunPRedAliq,
        pCbs: tax?.cbsPCbs,
        pRedCbs: tax?.cbsPRedAliq,
      };
      const amounts = {
        vProd: item.vProd,
        vFrete: item.vFrete,
        vSeg: item.vSeg,
        vDesc: item.vDesc,
        vOutro: item.vOutro,
      };
      return { item, tax, amounts, result: calculateItemTax(amounts, rates) };
    });

    await db.transaction(async (tx) => {
      for (const entry of calculated) {
        const result = entry.result;
        const values = {
          icmsVBc: money(result.vBc),
          icmsVIcms: money(result.vIcms),
          icmsVIcmsDeson: money(result.vIcmsDeson),
          icmsVFcp: money(result.vFcp),
          ipiVBc: money(result.ipiVBc),
          ipiVIpi: money(result.vIpi),
          icmsVBcSt: money(result.vBcSt),
          icmsVIcmsSt: money(result.vIcmsSt),
          icmsVBcUfDest: money(result.vBcUfDest),
          icmsVBcFcpUfDest: money(result.vBcFcpUfDest),
          icmsVIcmsUfDest: money(result.vIcmsUfDest),
          icmsVIcmsUfRemet: money(result.vIcmsUfRemet),
          icmsVFcpUfDest: money(result.vFcpUfDest),
          icmsVIcmsMono: money(result.vIcmsMono),
          pisVBc: money(result.pisVBc),
          pisVPis: money(result.vPis),
          cofinsVBc: money(result.cofinsVBc),
          cofinsVCofins: money(result.vCofins),
          issqnVBc: money(result.issqnVBc),
          issqnVIssqn: money(result.vIssqn),
          isVBc: money(result.vBcIs),
          isVIs: money(result.vIs),
          ibsCbsVBc: money(result.vBcIbsCbs),
          ibsUfPAliqEfet: rate(result.pAliqEfetIbsUf),
          ibsUfVIbs: money(result.vIbsUf),
          ibsMunPAliqEfet: rate(result.pAliqEfetIbsMun),
          ibsMunVIbs: money(result.vIbsMun),
          ibsVIbs: money(result.vIbs),
          cbsPAliqEfet: rate(result.pAliqEfetCbs),
          cbsVCbs: money(result.vCbs),
          vTotTrib: money(result.vTotTrib),
          updatedAt: new Date(),
        };
        if (entry.tax) {
          await tx
            .update(nfeItemTaxes)
            .set(values)
            .where(eq(nfeItemTaxes.id, entry.tax.id));
        } else {
          await tx.insert(nfeItemTaxes).values({
            nfeItemId: entry.item.id,
            ...values,
          });
        }
      }
      const totals = sumInvoiceTotals(
        calculated.map((entry) => ({
          amounts: entry.amounts,
          tax: entry.result,
        })),
      );
      await tx
        .update(nfeHeaders)
        .set({
          ...headerTotals(totals),
          updatedAt: new Date(),
        })
        .where(eq(nfeHeaders.id, header.id));
    });
    return this.auditDocumentChange(enterpriseId, nfeId, before, audit);
  }

  private async auditDocumentChange(
    enterpriseId: string,
    nfeId: string,
    before: Awaited<ReturnType<NfeDocumentService["get"]>>,
    audit: EntityAuditContext,
  ) {
    const after = await this.get(enterpriseId, nfeId);
    await recordEntityAudit({
      entityType: EntityTypes.NFE_HEADERS,
      entityId: nfeId,
      action: "UPDATE",
      before: toAuditRecord(before),
      after: toAuditRecord(after),
      ctx: { ...audit, enterpriseId },
    });
    return after;
  }

  public async xml(enterpriseId: string, nfeId: string) {
    const document = await this.get(enterpriseId, nfeId);
    const stored = await readStoredNfeXml(document.xmlArquivo);
    if (stored) {
      return { xml: stored };
    }
    return { xml: this.unsignedXml(document) };
  }

  public async signXml(
    enterpriseId: string,
    nfeId: string,
    audit: EntityAuditContext,
  ) {
    const before = await this.get(enterpriseId, nfeId);
    this.assertSendable(before);
    await this.persistSignedXml(enterpriseId, before);
    return this.auditDocumentChange(enterpriseId, nfeId, before, audit);
  }

  public async authorize(
    enterpriseId: string,
    nfeId: string,
    audit: EntityAuditContext,
  ) {
    const before = await this.get(enterpriseId, nfeId);
    this.assertSendable(before);
    if (before.tpAmb !== 1 && before.tpAmb !== 2) {
      throw new BadRequestError(
        "Ambiente da nota fiscal invalido",
        "NFE_AMBIENTE_INVALID",
      );
    }
    const { signed, certificate } = await this.persistSignedXml(
      enterpriseId,
      await this.refreshNfceEmission(before),
    );
    const result = await autorizarNfe({
      uf: this.emitUf(before),
      modelo: before.mod === "65" ? "65" : "55",
      ambiente: before.tpAmb,
      idLote: String(before.nNf).padStart(15, "0"),
      signedXml: signed,
      certificate,
    });
    if (result.chNFe && result.chNFe !== before.chave) {
      throw new BadRequestError(
        "A SEFAZ devolveu protocolo de outra chave de acesso",
        "NFE_PROTOCOL_MISMATCH",
      );
    }
    const receivedAt = result.dhRecbto ? new Date(result.dhRecbto) : null;
    let xmlArquivo = nfeSignedXmlRelativePath({
      cnpj: before.emitCnpj ?? "",
      dhEmi: before.dhEmi,
      chave: before.chave,
    });
    if (result.authorized && result.protNFeXml) {
      xmlArquivo = nfeProcXmlRelativePath({
        cnpj: before.emitCnpj ?? "",
        dhEmi: before.dhEmi,
        chave: before.chave,
      });
      await writeNfeXmlFile(
        xmlArquivo,
        buildProcNFeXml(signed, result.protNFeXml),
      );
    }
    await db
      .update(nfeHeaders)
      .set({
        status: result.authorized
          ? "AUTORIZADA"
          : result.denied
            ? "DENEGADA"
            : "REJEITADA",
        cStat: result.cStat,
        xMotivo: result.xMotivo.slice(0, 255),
        nProt: result.nProt ?? null,
        dhRecbto:
          receivedAt && !Number.isNaN(receivedAt.getTime()) ? receivedAt : null,
        digVal: result.digVal?.slice(0, 28) ?? null,
        xmlArquivo,
        updatedAt: new Date(),
      })
      .where(eq(nfeHeaders.id, nfeId));
    return this.auditDocumentChange(enterpriseId, nfeId, before, audit);
  }

  /**
   * NFC-e on-line precisa chegar a SEFAZ logo apos o dhEmi (rejeicao 704); no envio a data
   * passa a ser a do momento, desde que no mesmo AAMM da chave de acesso.
   */
  private async refreshNfceEmission(
    document: Awaited<ReturnType<NfeDocumentService["get"]>>,
  ) {
    if (document.mod !== "65") return document;
    const now = new Date();
    if (now.getTime() - document.dhEmi.getTime() < NFCE_EMISSION_FRESH_MS) return document;
    const local = formatSefazDateTime(now);
    const yearMonth = `${local.slice(2, 4)}${local.slice(5, 7)}`;
    if (document.chave.slice(2, 6) !== yearMonth) {
      throw new BadRequestError(
        "A NFC-e foi gerada em outro mes e nao pode mais ser enviada; gere uma nova nota.",
        "NFCE_EMISSION_MONTH",
      );
    }
    await db
      .update(nfeHeaders)
      .set({ dhEmi: now, updatedAt: now })
      .where(eq(nfeHeaders.id, document.id));
    return { ...document, dhEmi: now };
  }

  private assertSendable(
    document: Awaited<ReturnType<NfeDocumentService["get"]>>,
  ) {
    if (document.issuanceType === "TERCEIRO") {
      throw new BadRequestError(
        "Nota de terceiro nao e autorizada nesta API",
        "NFE_THIRD_PARTY",
      );
    }
    if (
      document.status === "AUTORIZADA" ||
      document.status === "CANCELADA" ||
      document.status === "DENEGADA"
    ) {
      throw new ConflictError(
        "Nota fiscal ja encerrada na SEFAZ",
        "NFE_ALREADY_CLOSED",
      );
    }
  }

  private emitUf(
    document: Awaited<ReturnType<NfeDocumentService["get"]>>,
  ): UfSigla {
    return resolveEmitUf(document);
  }

  private async persistSignedXml(
    enterpriseId: string,
    document: Awaited<ReturnType<NfeDocumentService["get"]>>,
  ) {
    const { certificate } = await nfeConfiguracaoService.loadCredentials(
      enterpriseId,
    );
    let signed = signNfeXml(this.unsignedXml(document), {
      privateKeyPem: certificate.key,
      certificatePem: certificate.leafCert,
    });
    let supl: NfceSupl | null = null;
    if (document.mod === "65") {
      const { idCsc, csc } = await nfeConfiguracaoService.getCsc(enterpriseId);
      supl = buildNfceSupl({
        uf: this.emitUf(document),
        chave: document.chave,
        tpAmb: document.tpAmb === 1 ? 1 : 2,
        tpEmis: Number(document.tpEmis),
        idCsc,
        csc,
      });
      signed = insertNfceSupl(signed, supl);
    }
    await assertNfeXmlSchema(signed);
    const xmlArquivo = nfeSignedXmlRelativePath({
      cnpj: document.emitCnpj ?? "",
      dhEmi: document.dhEmi,
      chave: document.chave,
    });
    await writeNfeXmlFile(xmlArquivo, signed);
    await db
      .update(nfeHeaders)
      .set({
        xmlArquivo,
        status: "ASSINADA",
        ...(supl ? { qrCode: supl.qrCode, urlChave: supl.urlChave } : {}),
        updatedAt: new Date(),
      })
      .where(eq(nfeHeaders.id, document.id));
    return { signed, certificate };
  }

  private unsignedXml(
    document: Awaited<ReturnType<NfeDocumentService["get"]>>,
  ) {
    if (!numericStateRegistration(document.emitIe)) {
      throw new BadRequestError(
        "A inscrição estadual do emitente deve conter apenas números. O texto ISENTO não entra na NF-e.",
        "NFE_EMIT_IE_INVALID",
      );
    }
    return buildNfeXml({
      chave: document.chave,
      cUf: document.cUf,
      cNf: document.cNf,
      natOp: document.natOp,
      mod: document.mod,
      serie: document.serie,
      nNf: document.nNf,
      dhEmi: document.dhEmi.toISOString(),
      dhSaiEnt: document.dhSaiEnt ? document.dhSaiEnt.toISOString() : null,
      tpNf: document.tpNf,
      idDest: document.idDest,
      cMunFg: document.cMunFg,
      tpImp: document.tpImp,
      tpEmis: document.tpEmis,
      cDv: document.cDv,
      tpAmb: document.tpAmb,
      finNfe: document.finNfe,
      indFinal: document.indFinal,
      indPres: document.indPres,
      procEmi: document.procEmi,
      verProc: document.verProc,
      emit: {
        cnpj: document.emitCnpj,
        cpf: document.emitCpf,
        xNome: document.emitXNome,
        xFant: document.emitXFant,
        ie: numericStateRegistration(document.emitIe) || undefined,
        crt: document.emitCrt,
        xlgr: document.emitXlgr,
        nro: document.emitNro,
        xcpl: document.emitXcpl,
        xbairro: document.emitXbairro,
        cmun: document.emitCmun,
        xmun: document.emitXmun,
        uf: document.emitUf,
        cep: document.emitCep,
        cpais: document.emitCpais,
        xpais: document.emitXpais,
        fone: document.emitFone,
      },
      dest: document.destXNome || document.destCnpj || document.destCpf
        ? {
            cnpj: document.destCnpj,
            cpf: document.destCpf,
            xNome: document.destXNome,
            ...destinationIe(document.mod, document.destIe, document.destIndIeDest),
            isuf: document.destIsuf,
            email: document.destEmail,
            xlgr: document.destXlgr,
            nro: document.destNro,
            xcpl: document.destXcpl,
            xbairro: document.destXbairro,
            cmun: document.destCmun,
            xmun: document.destXmun,
            uf: document.destUf,
            cep: document.destCep,
            fone: document.destFone,
          }
        : null,
      items: document.items.map((item) => ({
        nItem: item.nItem,
        cProd: item.cProd,
        cEan: item.cEan && isValidGtin(item.cEan) ? item.cEan : null,
        xProd: item.xProd,
        ncm: item.ncm,
        cBenef: item.cBenef,
        cfop: item.cfop,
        uCom: item.uCom,
        qCom: item.qCom,
        vUnCom: item.vUnCom,
        vProd: item.vProd,
        uTrib: item.uTrib,
        qTrib: item.qTrib,
        vUnTrib: item.vUnTrib,
        vFrete: item.vFrete,
        vSeg: item.vSeg,
        vDesc: item.vDesc,
        vOutro: item.vOutro,
        indTot: item.indTot,
        infAdProd: item.infAdProd,
        icmsOrig: item.tax?.icmsOrig,
        icmsCst: item.tax?.icmsCst,
        icmsCsosn: item.tax?.icmsCsosn,
        icmsModBc: item.tax?.icmsModBc,
        icmsVBc: item.tax?.icmsVBc,
        icmsPIcms: item.tax?.icmsPIcms,
        icmsVIcms: item.tax?.icmsVIcms,
        icmsPRedBc: item.tax?.icmsPRedBc,
        icmsVIcmsDeson: item.tax?.icmsVIcmsDeson,
        icmsMotDesIcms: item.tax?.icmsMotDesIcms,
        icmsIndDeduzDeson: item.tax?.icmsIndDeduzDeson,
        icmsPFcp: item.tax?.icmsPFcp,
        icmsVFcp: item.tax?.icmsVFcp,
        icmsModBcSt: item.tax?.icmsModBcSt,
        icmsPMvaSt: item.tax?.icmsPMvaSt,
        icmsPRedBcSt: item.tax?.icmsPRedBcSt,
        icmsVBcSt: item.tax?.icmsVBcSt,
        icmsPIcmsSt: item.tax?.icmsPIcmsSt,
        icmsVIcmsSt: item.tax?.icmsVIcmsSt,
        icmsVBcUfDest: item.tax?.icmsVBcUfDest,
        icmsVBcFcpUfDest: item.tax?.icmsVBcFcpUfDest,
        icmsPFcpUfDest: item.tax?.icmsPFcpUfDest,
        icmsPIcmsUfDest: item.tax?.icmsPIcmsUfDest,
        icmsPIcmsInter: item.tax?.icmsPIcmsInter,
        icmsPIcmsInterPart: item.tax?.icmsPIcmsInterPart,
        icmsVFcpUfDest: item.tax?.icmsVFcpUfDest,
        icmsVIcmsUfDest: item.tax?.icmsVIcmsUfDest,
        icmsVIcmsUfRemet: item.tax?.icmsVIcmsUfRemet,
        ipiCEnq: item.tax?.ipiCEnq,
        ipiCst: item.tax?.ipiCst,
        ipiVBc: item.tax?.ipiVBc,
        ipiPIpi: item.tax?.ipiPIpi,
        ipiVIpi: item.tax?.ipiVIpi,
        pisCst: item.tax?.pisCst,
        pisVBc: item.tax?.pisVBc,
        pisPPis: item.tax?.pisPPis,
        pisVPis: item.tax?.pisVPis,
        cofinsCst: item.tax?.cofinsCst,
        cofinsVBc: item.tax?.cofinsVBc,
        cofinsPCofins: item.tax?.cofinsPCofins,
        cofinsVCofins: item.tax?.cofinsVCofins,
        ibsCbsCst: item.tax?.ibsCbsCst,
        ibsCbsCClassTrib: item.tax?.ibsCbsCClassTrib,
        ibsCbsVBc: item.tax?.ibsCbsVBc,
        ibsUfPIbs: item.tax?.ibsUfPIbs,
        ibsUfPRedAliq: item.tax?.ibsUfPRedAliq,
        ibsUfPAliqEfet: item.tax?.ibsUfPAliqEfet,
        ibsUfVIbs: item.tax?.ibsUfVIbs,
        ibsMunPIbs: item.tax?.ibsMunPIbs,
        ibsMunPRedAliq: item.tax?.ibsMunPRedAliq,
        ibsMunPAliqEfet: item.tax?.ibsMunPAliqEfet,
        ibsMunVIbs: item.tax?.ibsMunVIbs,
        ibsVIbs: item.tax?.ibsVIbs,
        cbsPCbs: item.tax?.cbsPCbs,
        cbsPRedAliq: item.tax?.cbsPRedAliq,
        cbsPAliqEfet: item.tax?.cbsPAliqEfet,
        cbsVCbs: item.tax?.cbsVCbs,
        vTotTrib: item.tax?.vTotTrib,
      })),
      invoice: document.duplicates.length
        ? {
            nFat: document.nFat,
            vOrig: document.vOrig,
            vDesc: document.cobrVDesc,
            vLiq: document.vLiq,
            duplicates: document.duplicates.map((row) => ({
              nDup: row.nDup,
              dVenc: String(row.dVenc),
              vDup: row.vDup,
            })),
          }
        : null,
      payments: document.payments.map((payment) => {
        const resolved = resolveNfePayment(
          {
            tPag: payment.tPag,
            xPag: payment.xPag,
            cardTpIntegra: payment.cardTpIntegra,
            cardTBand: payment.cardTBand,
            cardCnpj: payment.cardCnpj,
            cardCAut: payment.cardCAut,
          },
          {
            paymentCode: payment.paymentCode,
            integration: payment.paymentIntegration,
            flagCode: payment.flagCode,
            flagDescription: payment.flagDescription,
            paymentDescription: payment.paymentDescription,
            cnpj: payment.paymentConfigCnpj,
          },
        );
        return {
          indPag: payment.indPag,
          vPag: payment.vPag,
          ...resolved,
        };
      }),
      vBc: document.vBc,
      vIcms: document.vIcms,
      vIcmsDeson: document.vIcmsDeson,
      vFcpUfDest: document.vFcpUfDest,
      vIcmsUfDest: document.vIcmsUfDest,
      vIcmsUfRemet: document.vIcmsUfRemet,
      vFcp: document.vFcp,
      vBcSt: document.vBcSt,
      vSt: document.vSt,
      vFcpSt: document.vFcpSt,
      vFcpStRet: document.vFcpStRet,
      vIi: document.vIi,
      vIpi: document.vIpi,
      vIpiDevol: document.vIpiDevol,
      vProd: document.vProd,
      vFrete: document.vFrete,
      vSeg: document.vSeg,
      vDesc: document.vDesc,
      vOutro: document.vOutro,
      vPis: document.vPis,
      vCofins: document.vCofins,
      vNf: document.vNf,
      vTotTrib: document.vTotTrib,
      vBcIbsCbs: document.vBcIbsCbs,
      vIbsUf: document.vIbsUf,
      vIbsMun: document.vIbsMun,
      vIbs: document.vIbs,
      vCbs: document.vCbs,
      vNfTot: document.vNfTot,
      transport: document.transport
        ? {
            modFrete: document.transport.modFrete,
            cnpj: document.transport.transpCnpj,
            cpf: document.transport.transpCpf,
            xNome: document.transport.transpXNome,
            ie: document.transport.transpIe,
            xEnder: document.transport.transpXEnder,
            xMun: document.transport.transpXMun,
            uf: document.transport.transpUf,
            veicPlaca: document.idDest === "2" ? null : document.transport.veicPlaca,
            veicUf: document.idDest === "2" ? null : document.transport.veicUf,
            veicRntc: document.idDest === "2" ? null : document.transport.veicRntc,
            volumes: document.transport.volumes.map((volume) => ({
              qVol: volume.qVol,
              esp: volume.esp,
              marca: volume.marca,
              nVol: volume.nVol,
              pesoL: volume.pesoL,
              pesoB: volume.pesoB,
            })),
          }
        : document.mod === "55"
          ? { modFrete: "9" }
          : null,
      infCpl: document.infCpl,
    });
  }

  public async linkCfop(
    enterpriseId: string,
    input: LinkCfopEnterpriseInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(cfopsEnterprises)
        .values({
          enterprisesId: enterpriseId,
          cfopId: input.cfopId,
          additionCfop: input.additionCfop,
          editDescription: input.editDescription,
          calculatesDifal: input.calculatesDifal,
        })
        .returning();
      if (!row) {
        throw new Error("Falha ao vincular CFOP a empresa");
      }
      await recordCreateAudit({
        entityType: EntityTypes.CFOPS_ENTERPRISES,
        entityId: row.id,
        after: row,
        ctx: { ...audit, enterpriseId },
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "CFOP ja vinculado a esta empresa",
          "CFOP_ENTERPRISE_CONFLICT",
        );
      }
      throw err;
    }
  }

  private async loadHeader(enterpriseId: string, nfeId: string) {
    const rows = await db
      .select()
      .from(nfeHeaders)
      .where(
        and(
          eq(nfeHeaders.id, nfeId),
          eq(nfeHeaders.enterpriseId, enterpriseId),
          isNull(nfeHeaders.deletedAt),
        ),
      )
      .limit(1);
    const header = rows[0];
    if (!header) {
      throw new NotFoundError("Nota fiscal nao encontrada", "NFE_NOT_FOUND");
    }
    return header;
  }
}

export const nfeDocumentService = new NfeDocumentService();
