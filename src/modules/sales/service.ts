import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  enterprisesMembers,
  productTypes,
  productsEnterprises,
  sales,
  salesBudgetConversionItems,
  salesBudgetConversions,
  salesDues,
  salesItems,
  salesPayments,
  users,
} from "../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
} from "../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../shared/audit/entity-types.js";
import { PRODUCT_TYPE_SERVICE_CODE } from "../../shared/products/product-type-service.js";
import {
  assertSaleOrderNumberAvailable,
  nextSaleOrderNumber,
  syncSaleOrderSequenceFloor,
} from "./sequences.js";
import {
  applySaleItemStockOut,
  applySaleItemStockReturn,
  assertSaleItemStockAvailable,
  assertSaleItemsStockCommitted,
  syncSaleItemStockOnUpdate,
  validateSaleItemStock,
} from "./sale-stock.js";
import {
  computeItemValueTotal,
  type ConvertBudgetToSaleInput,
  type CreateSaleInput,
  type CreateSaleItemInput,
  type ListSalesQuery,
  type PatchSaleInput,
  type PatchSaleItemInput,
  type SalePaymentInput,
} from "./schema.js";

type BudgetClosureSituation = "ABERTO" | "PARCIAL" | "FECHADO";
type BudgetConversionKind = "PARCIAL" | "TOTAL";

const dec = (v: number | undefined | null) =>
  v !== undefined && v !== null ? v.toString() : null;

const decNum = (v: string | null | undefined) =>
  v !== undefined && v !== null && v !== "" ? Number(v) : 0;

const moneyCents = (value: number) => Math.round(value * 100);

const roundMoney = (value: number) => Math.round(value * 100) / 100;

/** Formata percentual 0–100 para numeric(6,2). */
const decPercentage = (v: number | undefined | null) =>
  v !== undefined && v !== null ? roundMoney(v).toFixed(2) : null;

const hasStoredPercentage = (value: string | null | undefined) =>
  value !== null && value !== undefined && value !== "";

const computeFinancialFromPercentage = (subTotal: number, percentage: number) =>
  roundMoney((subTotal * percentage) / 100);

const computePercentageFromFinancial = (subTotal: number, value: number) =>
  subTotal > 0 ? roundMoney((value / subTotal) * 100) : 0;

const resolveFinancialAdjustments = (  // Calcula os valores financeiros da venda
  sale: Pick<
    typeof sales.$inferSelect,
    | "percentageDiscount"
    | "percentageAcresce"
    | "valueDiscountFinancial"
    | "valueAcresceFinancial"
  >,
  subTotal: number,
) => {
  let valueDiscountFinancial: number;
  let percentageDiscount: string | null;

  if (hasStoredPercentage(sale.percentageDiscount)) {
    const pct = decNum(sale.percentageDiscount);
    valueDiscountFinancial = computeFinancialFromPercentage(subTotal, pct);
    percentageDiscount = sale.percentageDiscount;
  } else {
    valueDiscountFinancial = decNum(sale.valueDiscountFinancial);
    percentageDiscount =
      valueDiscountFinancial > 0
        ? decPercentage(
            computePercentageFromFinancial(subTotal, valueDiscountFinancial),
          )
        : null;
  }

  let valueAcresceFinancial: number;
  let percentageAcresce: string | null;

  if (hasStoredPercentage(sale.percentageAcresce)) {
    const pct = decNum(sale.percentageAcresce);
    valueAcresceFinancial = computeFinancialFromPercentage(subTotal, pct);
    percentageAcresce = sale.percentageAcresce;
  } else {
    valueAcresceFinancial = decNum(sale.valueAcresceFinancial);
    percentageAcresce =
      valueAcresceFinancial > 0
        ? decPercentage(
            computePercentageFromFinancial(subTotal, valueAcresceFinancial),
          )
        : null;
  }

  return {
    valueDiscountFinancial,
    percentageDiscount,
    valueAcresceFinancial,
    percentageAcresce,
  };
};

/** Chave YYYY-MM-DD (UTC) para comparar vencimentos sem repetir o mesmo dia. */
const toUtcDateKey = (date: Date) => {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const saleWithMemberSelect = { 
  id: sales.id,
  orderNumber: sales.orderNumber,
  userId: sales.userId,
  UserName: sales.userLegalName,
  memberId: sales.memberId,
  memberName: users.userName,
  type: sales.type,
  subTotal: sales.subTotal,
  percentageDiscount: sales.percentageDiscount,
  discountValuetems: sales.discountValuetems,
  valueDiscountFinancial: sales.valueDiscountFinancial,
  percentageAcresce: sales.percentageAcresce,
  valueAcresceItems: sales.valueAcresceItems,
  valueAcresceFinancial: sales.valueAcresceFinancial,
  valuePie: sales.valuePie,
  valueService: sales.valueService,
  valueLiquid: sales.valueLiquid,
  status: sales.status,
  returnSituation: sales.returnSituation,
  budgetClosureSituation: sales.budgetClosureSituation,
  sourceBudgetSaleId: sales.sourceBudgetSaleId,
  completedionDate: sales.completedionDate,
  enterprisesId: sales.enterprisesId,
  createdAt: sales.createdAt,
  updatedAt: sales.updatedAt,
};

export class SalesService {  // Servico de vendas
  private async recordSaleUpdateAudit(
    enterpriseId: string,
    saleId: string,
    before: typeof sales.$inferSelect,
    ctx: EntityAuditContext,
  ) {
    const after = await this.getSaleRow(db, enterpriseId, saleId);
    await recordEntityAudit({
      entityType: EntityTypes.SALES,
      entityId: saleId,
      action: "UPDATE",
      before: toAuditRecord(before),
      after: toAuditRecord(after),
      ctx: { ...ctx, enterpriseId },
    });
  }

  private scope(enterpriseId: string, id?: string) {  // Scope para buscar vendas
    const base = [eq(sales.enterprisesId, enterpriseId)];
    if (id) base.push(eq(sales.id, id));
    return and(...base);
  }

  private listScope(enterpriseId: string, query?: ListSalesQuery) {
    const filters: SQL[] = [eq(sales.enterprisesId, enterpriseId)];
    if (query?.type) {
      filters.push(eq(sales.type, query.type));
    }
    if (query?.budgetClosureSituation) {
      filters.push(
        eq(sales.budgetClosureSituation, query.budgetClosureSituation),
      );
    }
    if (query?.status) {
      filters.push(eq(sales.status, query.status));
    }
    if (query?.userId) {
      filters.push(eq(sales.userId, query.userId));
    }
    if (query?.orderNumber) {
      const term = `%${query.orderNumber}%`;
      filters.push(sql`cast(${sales.orderNumber} as text) ilike ${term}`);
    }
    if (query?.seller) {
      filters.push(ilike(sales.userLegalName, `%${query.seller}%`));
    }
    if (query?.client) {
      filters.push(ilike(users.userName, `%${query.client}%`));
    }
    return and(...filters);
  }

  private listFromWithMemberJoins() {
    return db
      .select(saleWithMemberSelect)
      .from(sales)
      .leftJoin(
        enterprisesMembers,
        eq(sales.memberId, enterprisesMembers.id),
      )
      .leftJoin(users, eq(enterprisesMembers.userId, users.id));
  }

  private listCountFromWithMemberJoins() {
    return db
      .select({ c: count() })
      .from(sales)
      .leftJoin(
        enterprisesMembers,
        eq(sales.memberId, enterprisesMembers.id),
      )
      .leftJoin(users, eq(enterprisesMembers.userId, users.id));
  }

  private mapSaleItemResponse(
    item: typeof salesItems.$inferSelect,
    product?: {
      productDescription: string;
      productCode: number | null;
    },
  ) {
    const quantity = decNum(item.quantity);
    const quantityConverted = decNum(item.quantityConverted);
    return {
      ...item,
      quantityConverted: item.quantityConverted,
      quantityRemaining: Math.max(0, quantity - quantityConverted),
      productDescription: product?.productDescription ?? null,
      productCode: product?.productCode ?? null,
    };
  }

  private async loadSaleItems(saleId: string) {
    const rows = await db
      .select({
        item: salesItems,
        productDescription: productsEnterprises.description,
        productCode: productsEnterprises.code,
      })
      .from(salesItems)
      .innerJoin(
        productsEnterprises,
        eq(salesItems.productsEnterprisesId, productsEnterprises.id),
      )
      .where(eq(salesItems.salesId, saleId));

    return rows.map(({ item, productDescription, productCode }) =>
      this.mapSaleItemResponse(item, { productDescription, productCode }),
    );
  }

  private computeBudgetClosureSituation(
    items: Pick<
      typeof salesItems.$inferSelect,
      "quantity" | "quantityConverted"
    >[],
  ): BudgetClosureSituation {
    if (items.length === 0) return "ABERTO";

    let anyConverted = false;
    let allFullyConverted = true;

    for (const item of items) {
      const qty = decNum(item.quantity);
      const converted = decNum(item.quantityConverted);
      if (converted > 0) anyConverted = true;
      if (converted + 1e-9 < qty) allFullyConverted = false;
    }

    if (allFullyConverted) return "FECHADO";
    if (anyConverted) return "PARCIAL";
    return "ABERTO";
  }

  private assertBudgetOpenForConversion(budget: typeof sales.$inferSelect) {  // Verifica se o orcamento esta aberto para conversao
    if (budget.type !== "ORCAMENTO") {
      throw new ValidationError(
        [{ path: "params.saleId", message: "Somente orcamentos podem ser convertidos" }],
        "Tipo invalido",
      );
    }
    if (budget.status !== "ABERTA") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Somente orcamentos ABERTOS podem ser convertidos",
          },
        ],
        "Orcamento nao editavel",
      );
    }
    if (budget.budgetClosureSituation === "FECHADO") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Orcamento ja foi totalmente convertido em vendas",
          },
        ],
        "Orcamento fechado",
      );
    }
  }

  private assertBudgetEditableForItems(budget: typeof sales.$inferSelect) {  // Verifica se o orcamento esta aberto para alterar itens
    this.assertSaleOpenForItems(budget);
    if (budget.type === "ORCAMENTO" && budget.budgetClosureSituation === "FECHADO") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Orcamento fechado nao permite alterar itens",
          },
        ],
        "Orcamento fechado",
      );
    }
  }

  private assertBudgetItemEditable(  // Verifica se o item do orcamento esta aberto para alterar
    budget: typeof sales.$inferSelect,
    item: typeof salesItems.$inferSelect,
    nextQuantity?: number,
  ) {
    if (budget.type !== "ORCAMENTO") return;

    const converted = decNum(item.quantityConverted);
    if (converted > 0 && nextQuantity === undefined) {
      throw new ValidationError(
        [
          {
            path: "params.saleItemId",
            message: "Item com quantidade convertida nao pode ser removido",
          },
        ],
        "Item convertido",
      );
    }

    if (nextQuantity !== undefined && nextQuantity < converted) {
      throw new ValidationError(
        [
          {
            path: "body.quantity",
            message: `Quantidade nao pode ser menor que ${converted} (ja convertida)`,
          },
        ],
        "Quantidade invalida",
      );
    }
  }

  private prorateItemFinancials(
    budgetItem: typeof salesItems.$inferSelect,
    convertQuantity: number,
    itemPath: string,
  ): CreateSaleItemInput {
    const budgetQty = decNum(budgetItem.quantity);
    const ratio = convertQuantity / budgetQty;
    const valueUnit = decNum(budgetItem.valueUnit);
    const valueDiscount = roundMoney(decNum(budgetItem.valueDiscount) * ratio);
    const valueAcresce = roundMoney(decNum(budgetItem.valueAcresce) * ratio);
    const valueTotal = computeItemValueTotal(
      convertQuantity,
      valueUnit,
      valueDiscount,
      valueAcresce,
    );

    return {
      quantity: convertQuantity,
      valueUnit,
      valueDiscount,
      valueAcresce,
      valueTotal,
      productsEnterprisesId: budgetItem.productsEnterprisesId,
      unitId: budgetItem.unitid,
      productTypeId: budgetItem.productTypeId,
      stockSectorId: budgetItem.stockSectorId ?? undefined,
      stockLocationId: budgetItem.stockLocationId ?? undefined,
      stockBatchId: budgetItem.stockBatchId ?? undefined,
    } satisfies CreateSaleItemInput;
  }

  private async getSaleRow(  // Obtem a venda pelo id
    tx: Tx | typeof db,
    enterpriseId: string,
    saleId: string,
  ) {  // Obtem a venda pelo id
    const row = (
      await tx
        .select()
        .from(sales)
        .where(this.scope(enterpriseId, saleId))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError("Venda nao encontrada", "SALE_NOT_FOUND");
    }
    return row;
  }

  private assertSaleOpenForItems(sale: { status: string }) {     // Verifica se a venda esta aberta para adicionar itens
    if (sale.status !== "ABERTA") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Somente vendas ABERTAS permitem alterar itens",
          },
        ],
        "Venda nao editavel",
      );
    }
  }

  private assertSalePaymentsMatchSale(   // Verifica se o valor liquido da venda corresponde a soma dos pagamentos
    valueLiquid: string | number | null,
    saleCreatedAt: Date,
    payments: SalePaymentInput[],
  ) {
    const issues: { path: string; message: string }[] = [];

    if (valueLiquid === null || valueLiquid === "") {
      issues.push({
        path: "body.valueLiquid",
        message: "Valor liquido da venda e obrigatorio para fechar com pagamentos",
      });
    }

    const liquidCents = moneyCents(
      typeof valueLiquid === "number" ? valueLiquid : decNum(valueLiquid),
    );
    const saleDayKey = toUtcDateKey(saleCreatedAt);

    const paymentTypeIds = new Set<string>();
    let paymentsSumCents = 0;

    for (let pIdx = 0; pIdx < payments.length; pIdx++) {
      const payment = payments[pIdx];
      const paymentPath = `body.payments.${pIdx}`;

      if (paymentTypeIds.has(payment.paymentTypeId)) {
        issues.push({
          path: `${paymentPath}.paymentTypeId`,
          message: "Tipo de pagamento duplicado na mesma venda",
        });
      }
      paymentTypeIds.add(payment.paymentTypeId);

      paymentsSumCents += moneyCents(payment.valueTotal);

      let duesSumCents = 0;
      const dueDateKeys = new Set<string>();

      for (let dIdx = 0; dIdx < payment.dues.length; dIdx++) {
        const due = payment.dues[dIdx];
        const duePath = `${paymentPath}.dues.${dIdx}`;

        duesSumCents += moneyCents(due.valueInstallment);

        const dueDayKey = toUtcDateKey(due.dueDate);
        if (dueDateKeys.has(dueDayKey)) {
          issues.push({
            path: `${duePath}.dueDate`,
            message: "Data de vencimento duplicada para o mesmo pagamento",
          });
        }
        dueDateKeys.add(dueDayKey);

        if (dueDayKey < saleDayKey) {
          issues.push({
            path: `${duePath}.dueDate`,
            message:
              "Data de vencimento nao pode ser anterior a data de criacao da venda",
          });
        }
      }

      if (duesSumCents !== moneyCents(payment.valueTotal)) {
        issues.push({
          path: `${paymentPath}.dues`,
          message: "Soma das parcelas deve ser igual ao valor total do pagamento",
        });
      }
    }

    if (paymentsSumCents !== liquidCents) {
      issues.push({
        path: "body.payments",
        message: "Soma dos pagamentos deve ser igual ao valor liquido da venda",
      });
    }

    if (issues.length > 0) {
      throw new ValidationError(issues, "Pagamentos invalidos");
    }
  }

  private async insertSalePayments(   // Insere os pagamentos na venda
    tx: Tx,
    saleId: string,
    payments: SalePaymentInput[],
  ) {
    for (const payment of payments) {
      const [pay] = await tx
        .insert(salesPayments)
        .values({
          valueTotal: payment.valueTotal.toString(),
          paymentTypeId: payment.paymentTypeId,
          salesId: saleId,
        })
        .returning();
      if (!pay) continue;
      await tx.insert(salesDues).values(
        payment.dues.map((due) => ({
          salesId: saleId,
          salesPaymentId: pay.id,
          valueInstallment: due.valueInstallment.toString(),
          dueDate: due.dueDate,
        })),
      );
    }
  }

  private async assertSaleHasNoPayments(tx: Tx, saleId: string) {   // Verifica se a venda nao possui pagamentos cadastrados
    const existing = (
      await tx
        .select({ id: salesPayments.id })
        .from(salesPayments)
        .where(eq(salesPayments.salesId, saleId))
        .limit(1)
    )[0];
    if (existing) {
      throw new ValidationError(
        [
          {
            path: "body.payments",
            message: "Venda ja possui pagamentos cadastrados",
          },
        ],
        "Pagamentos ja informados",
      );
    }
  }

  private mapItemInputToInsert(saleId: string, item: CreateSaleItemInput) {   // Mapeia o item para ser inserido na venda
    const valueTotal = computeItemValueTotal(
      item.quantity,
      item.valueUnit,
      item.valueDiscount,
      item.valueAcresce,
    );
    return {
      quantity: item.quantity.toString(),
      valueUnit: item.valueUnit.toString(),
      valueDiscount: item.valueDiscount.toString(),
      valueAcresce: item.valueAcresce.toString(),
      valueTotal: valueTotal.toString(),
      salesId: saleId,
      productsEnterprisesId: item.productsEnterprisesId,
      unitid: item.unitId,
      productTypeId: item.productTypeId,
      stockSectorId: item.stockSectorId ?? null,
      stockLocationId: item.stockLocationId ?? null,
      stockBatchId: item.stockBatchId ?? null,
    };
  }

  private computeValueLiquid(
    subTotal: number,
    sale: Pick<
      typeof sales.$inferSelect,
      | "discountValuetems"
      | "valueDiscountFinancial"
      | "valueAcresceItems"
      | "valueAcresceFinancial"
    >,
  ) {
    return Math.max(
      0,
      subTotal -
        decNum(sale.discountValuetems) -
        decNum(sale.valueDiscountFinancial) +
        decNum(sale.valueAcresceItems) +
        decNum(sale.valueAcresceFinancial),
    );
  }

  private async recalculateSaleTotalsFromItems(   // Recalcula os totais da venda a partir dos itens
    tx: Tx,
    enterpriseId: string,
    saleId: string,
    sale: typeof sales.$inferSelect,
  ) {
    const itemRows = await tx
      .select({
        quantity: salesItems.quantity,
        valueUnit: salesItems.valueUnit,
        valueDiscount: salesItems.valueDiscount,
        valueAcresce: salesItems.valueAcresce,
        productTypeId: salesItems.productTypeId,
        typeCode: productTypes.type,
      })
      .from(salesItems)
      .innerJoin(productTypes, eq(salesItems.productTypeId, productTypes.id))
      .where(eq(salesItems.salesId, saleId));

    const subTotal = itemRows.reduce(
      (sum, row) => sum + Number(row.quantity) * Number(row.valueUnit),
      0,
    );
    const discountValuetems = itemRows.reduce(
      (sum, row) => sum + Number(row.valueDiscount),
      0,
    );
    const valueAcresceItems = itemRows.reduce(
      (sum, row) => sum + Number(row.valueAcresce),
      0,
    );

    let valuePie = 0;
    let valueService = 0;
    for (const row of itemRows) {
      const net = computeItemValueTotal(
        Number(row.quantity),
        Number(row.valueUnit),
        Number(row.valueDiscount),
        Number(row.valueAcresce),
      );
      if (row.typeCode === PRODUCT_TYPE_SERVICE_CODE) {
        valueService += net;
      } else {
        valuePie += net;
      }
    }
    valuePie = roundMoney(valuePie);
    valueService = roundMoney(valueService);

    const financial = resolveFinancialAdjustments(sale, subTotal);

    const saleWithAggregates = {
      ...sale,
      discountValuetems: discountValuetems.toString(),
      valueAcresceItems: valueAcresceItems.toString(),
      valueDiscountFinancial: financial.valueDiscountFinancial.toString(),
      valueAcresceFinancial: financial.valueAcresceFinancial.toString(),
    };
    const valueLiquid = this.computeValueLiquid(subTotal, saleWithAggregates);

    await tx
      .update(sales)
      .set({
        subTotal: subTotal.toString(),
        discountValuetems: discountValuetems.toString(),
        valueAcresceItems: valueAcresceItems.toString(),
        percentageDiscount: financial.percentageDiscount,
        valueDiscountFinancial: financial.valueDiscountFinancial.toString(),
        percentageAcresce: financial.percentageAcresce,
        valueAcresceFinancial: financial.valueAcresceFinancial.toString(),
        valuePie: valuePie.toString(),
        valueService: valueService.toString(),
        valueLiquid: valueLiquid.toString(),
        updatedAt: new Date(),
      })
      .where(this.scope(enterpriseId, saleId));

    return {
      subTotal,
      discountValuetems,
      valueAcresceItems,
      valueDiscountFinancial: financial.valueDiscountFinancial,
      valueAcresceFinancial: financial.valueAcresceFinancial,
      valuePie,
      valueService,
      valueLiquid,
    };
  }

  private mergeSaleItemPatch(  
    existing: typeof salesItems.$inferSelect,
    input: PatchSaleItemInput,
  ): CreateSaleItemInput {
    const quantity =
      input.quantity !== undefined
        ? input.quantity
        : Number(existing.quantity);
    const valueUnit =
      input.valueUnit !== undefined
        ? input.valueUnit
        : Number(existing.valueUnit);
    const valueDiscount =
      input.valueDiscount !== undefined
        ? input.valueDiscount
        : Number(existing.valueDiscount);
    const valueAcresce =
      input.valueAcresce !== undefined
        ? input.valueAcresce
        : Number(existing.valueAcresce);

    const valueTotal = computeItemValueTotal(
      quantity,
      valueUnit,
      valueDiscount,
      valueAcresce,
    );

    return {
      quantity,
      valueUnit,
      valueDiscount,
      valueAcresce,
      valueTotal,
      productsEnterprisesId:
        input.productsEnterprisesId ?? existing.productsEnterprisesId,
      unitId: input.unitId ?? existing.unitid,
      productTypeId: input.productTypeId ?? existing.productTypeId,
      stockSectorId: input.stockSectorId ?? existing.stockSectorId ?? undefined,
      stockLocationId:
        input.stockLocationId ?? existing.stockLocationId ?? undefined,
      stockBatchId:
        input.stockBatchId !== undefined
          ? input.stockBatchId ?? undefined
          : existing.stockBatchId ?? undefined,
    };
  }

  public async recalculateTotals(
    enterpriseId: string,
    saleId: string,
    audit: EntityAuditContext,
  ) {
    let beforeRow!: typeof sales.$inferSelect;
    await db.transaction(async (tx) => {
      beforeRow = await this.getSaleRow(tx, enterpriseId, saleId);
      const sale = beforeRow;
      if (sale.status !== "ABERTA") {
        throw new ValidationError(
          [
            {
              path: "params.saleId",
              message: "Somente vendas ABERTAS permitem recalcular totais",
            },
          ],
          "Venda nao editavel",
        );
      }
      await this.recalculateSaleTotalsFromItems(tx, enterpriseId, saleId, sale);
    });
    await this.recordSaleUpdateAudit(enterpriseId, saleId, beforeRow, audit);
    return this.getById(enterpriseId, saleId);
  }

  private async resolveSeller(  // Obtem o vendedor pelo id
    sellerUserId: string,
  ): Promise<{ userId: string; userLegalName: string }> {
    const row = (
      await db
        .select({ id: users.id, userName: users.userName })
        .from(users)
        .where(and(eq(users.id, sellerUserId), isNull(users.deletedAt)))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError("Usuario nao encontrado", "USER_NOT_FOUND");
    }
    return {
      userId: row.id,
      userLegalName: row.userName.trim().toUpperCase(),
    };
  }

  private async assertClientMember(  // Verifica se o cliente esta ativo na empresa
    tx: Tx | typeof db,
    enterpriseId: string,
    memberId: string,
  ) {
    const row = (
      await tx
        .select({ id: enterprisesMembers.id })
        .from(enterprisesMembers)
        .where(
          and(
            eq(enterprisesMembers.id, memberId),
            eq(enterprisesMembers.enterpriseId, enterpriseId),
            eq(enterprisesMembers.status, "ATIVO"),
            isNull(enterprisesMembers.deletedAt),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Membro cliente nao encontrado na empresa",
        "SALE_CLIENT_MEMBER_NOT_FOUND",
      );
    }
  }

  public async list(enterpriseId: string, query: ListSalesQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.listScope(enterpriseId, query);
    const [items, totalRows] = await Promise.all([
      this.listFromWithMemberJoins()
        .where(where)
        .orderBy(desc(sales.createdAt), asc(sales.id))
        .limit(limit)
        .offset(offset),
      this.listCountFromWithMemberJoins().where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  private async loadGeneratedSalesSummary(  // Obtem o resumo das vendas geradas
    enterpriseId: string,
    budgetSaleId: string,
  ) {
    return db
      .select({
        id: sales.id,
        orderNumber: sales.orderNumber,
        status: sales.status,
        valueLiquid: sales.valueLiquid,
        createdAt: sales.createdAt,
      })
      .from(sales)
      .where(
        and(
          eq(sales.enterprisesId, enterpriseId),
          eq(sales.sourceBudgetSaleId, budgetSaleId),
        ),
      )
      .orderBy(asc(sales.createdAt), asc(sales.id));
  }

  private async loadSourceBudgetSummary(  // Obtem o resumo do orcamento fonte
    enterpriseId: string,
    sourceBudgetSaleId: string,
  ) {
    const row = (
      await db
        .select({
          id: sales.id,
          orderNumber: sales.orderNumber,
          type: sales.type,
          status: sales.status,
          budgetClosureSituation: sales.budgetClosureSituation,
        })
        .from(sales)
        .where(
          and(
            eq(sales.enterprisesId, enterpriseId),
            eq(sales.id, sourceBudgetSaleId),
          ),
        )
        .limit(1)
    )[0];
    return row ?? null;
  }

  public async getById(enterpriseId: string, id: string) {  // Obtem a venda pelo id
    const sale = (
      await db
        .select(saleWithMemberSelect)
        .from(sales)
        .leftJoin(
          enterprisesMembers,
          eq(sales.memberId, enterprisesMembers.id),
        )
        .leftJoin(users, eq(enterprisesMembers.userId, users.id))
        .where(this.scope(enterpriseId, id))
        .limit(1)
    )[0];
    if (!sale) {
      throw new NotFoundError("Venda nao encontrada", "SALE_NOT_FOUND");
    }
    const [items, payments] = await Promise.all([
      this.loadSaleItems(id),
      db.select().from(salesPayments).where(eq(salesPayments.salesId, id)),
    ]);
    const paymentIds = payments.map((p) => p.id);
    const allDues =
      paymentIds.length > 0
        ? await db
            .select()
            .from(salesDues)
            .where(inArray(salesDues.salesPaymentId, paymentIds))
        : [];

    const mappedItems = items;

    const generatedSales =
      sale.type === "ORCAMENTO"
        ? await this.loadGeneratedSalesSummary(enterpriseId, id)
        : undefined;

    const sourceBudget =
      sale.sourceBudgetSaleId !== null
        ? await this.loadSourceBudgetSummary(
            enterpriseId,
            sale.sourceBudgetSaleId,
          )
        : undefined;

    return {
      ...sale,
      items: mappedItems,
      payments: payments.map((p) => ({
        ...p,
        dues: allDues.filter((d) => d.salesPaymentId === p.id),
      })),
      ...(generatedSales !== undefined ? { generatedSales } : {}),
      ...(sourceBudget !== undefined ? { sourceBudget } : {}),
    };
  }

  public async listBudgetConversions(enterpriseId: string, budgetSaleId: string) {  // Lista as conversões de orcamentos  
    const budget = await this.getSaleRow(db, enterpriseId, budgetSaleId);
    if (budget.type !== "ORCAMENTO") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Historico de conversao disponivel apenas para orcamentos",
          },
        ],
        "Tipo invalido",
      );
    }

    const conversions = await db
      .select({
        id: salesBudgetConversions.id,
        budgetSaleId: salesBudgetConversions.budgetSaleId,
        generatedSaleId: salesBudgetConversions.generatedSaleId,
        generatedOrderNumber: sales.orderNumber,
        generatedStatus: sales.status,
        generatedValueLiquid: sales.valueLiquid,
        closureKind: salesBudgetConversions.closureKind,
        userId: salesBudgetConversions.userId,
        userLegalName: salesBudgetConversions.userLegalName,
        createdAt: salesBudgetConversions.createdAt,
      })
      .from(salesBudgetConversions)
      .innerJoin(
        sales,
        eq(salesBudgetConversions.generatedSaleId, sales.id),
      )
      .where(
        and(
          eq(salesBudgetConversions.enterprisesId, enterpriseId),
          eq(salesBudgetConversions.budgetSaleId, budgetSaleId),
        ),
      )
      .orderBy(asc(salesBudgetConversions.createdAt), asc(salesBudgetConversions.id));

    if (conversions.length === 0) {
      return { items: [] };
    }

    const conversionIds = conversions.map((c) => c.id);
    const conversionItems = await db
      .select()
      .from(salesBudgetConversionItems)
      .where(inArray(salesBudgetConversionItems.conversionId, conversionIds));

    return {
      items: conversions.map((conversion) => ({
        ...conversion,
        items: conversionItems.filter(
          (item) => item.conversionId === conversion.id,
        ),
      })),
    };
  }

  public async create(
    enterpriseId: string,
    sellerUserId: string | null,
    input: CreateSaleInput,
    audit: EntityAuditContext,
  ) {
    if (!sellerUserId) {
      throw new ValidationError(
        [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
        "Nao autenticado",
      );
    }
    const seller = await this.resolveSeller(sellerUserId);

    const status = input.status;
    if (status === "FINALIZADA" && input.type !== "VENDA") {
      throw new ValidationError(
        [{ path: "body.status", message: "Orcamento nao pode ser finalizado com baixa de estoque" }],
        "Status invalido",
      );
    }

    try {
      const saleId = await db.transaction(async (tx) => {
        await this.assertClientMember(tx, enterpriseId, input.memberId);

        let orderNumber: number;
        if (input.orderNumber !== undefined) {
          await assertSaleOrderNumberAvailable(
            enterpriseId,
            input.orderNumber,
            tx,
          );
          await syncSaleOrderSequenceFloor(
            enterpriseId,
            input.orderNumber,
            tx,
          );
          orderNumber = input.orderNumber;
        } else {
          orderNumber = await nextSaleOrderNumber(enterpriseId, tx);
        }

        const [sale] = await tx
          .insert(sales)
          .values({
            orderNumber,
            userId: seller.userId,
            userLegalName: seller.userLegalName,
            memberId: input.memberId,
            type: input.type,
            subTotal: "0",
            percentageDiscount: decPercentage(input.percentageDiscount),
            discountValuetems: dec(input.discountValuetems),
            valueDiscountFinancial: dec(input.valueDiscountFinancial),
            percentageAcresce: decPercentage(input.percentageAcresce),
            valueAcresceItems: dec(input.valueAcresceItems),
            valueAcresceFinancial: dec(input.valueAcresceFinancial),
            valueLiquid: "0",
            status,
            completedionDate: status === "FINALIZADA" ? new Date() : null,
            enterprisesId: enterpriseId,
          })
          .returning();
        if (!sale) throw new Error("Falha ao criar venda");

        for (let i = 0; i < input.items.length; i++) {
          const itemInput = input.items[i];

          if (input.type === "VENDA") {
            await assertSaleItemStockAvailable(
              tx,
              enterpriseId,
              itemInput,
              `items.${i}`,
            );
          } else {
            await validateSaleItemStock(enterpriseId, itemInput, `items.${i}`);
          }

          const [inserted] = await tx
            .insert(salesItems)
            .values(this.mapItemInputToInsert(sale.id, itemInput))
            .returning();
          if (!inserted) throw new Error("Falha ao incluir item na venda");

          if (input.type === "VENDA") {
            await applySaleItemStockOut(tx, {
              enterpriseId,
              userId: sellerUserId,
              saleId: sale.id,
              orderNumber: sale.orderNumber,
              item: inserted,
            });
          }
        }

        await this.recalculateSaleTotalsFromItems(
          tx,
          enterpriseId,
          sale.id,
          sale,
        );

        if (status === "FINALIZADA" && input.payments?.length) {
          const updatedSale = await this.getSaleRow(tx, enterpriseId, sale.id);
          if (!updatedSale) throw new Error("Falha ao recalcular venda");
          this.assertSalePaymentsMatchSale(
            updatedSale.valueLiquid,
            updatedSale.createdAt,
            input.payments,
          );
          await this.insertSalePayments(tx, sale.id, input.payments);
        }

        return sale.id;
      });

      const saleRow = await this.getSaleRow(db, enterpriseId, saleId);
      await recordCreateAudit({
        entityType: EntityTypes.SALES,
        entityId: saleId,
        after: toAuditRecord(saleRow),
        ctx: { ...audit, enterpriseId },
      });

      return this.getById(enterpriseId, saleId);
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Venda em conflito (numero do pedido)",
          "SALE_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    userId: string | null,
    input: PatchSaleInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    if (
      existing.type === "ORCAMENTO" &&
      existing.budgetClosureSituation === "FECHADO"
    ) {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Orcamento fechado nao pode ser alterado",
          },
        ],
        "Orcamento fechado",
      );
    }
    const previousStatus = existing.status;
    const nextStatus = input.status ?? existing.status;

    if (
      previousStatus === "CANCELADA" &&
      input.status !== undefined &&
      input.status !== "CANCELADA"
    ) {
      throw new ValidationError(
        [{ path: "body.status", message: "Venda cancelada nao pode mudar de status" }],
        "Status invalido",
      );
    }

    if (previousStatus !== "ABERTA") {
      throw new ValidationError(
        [
          {
            path: "body",
            message:
              "Venda finalizada ou cancelada nao pode ser alterada. Use devolucoes para estorno parcial.",
          },
        ],
        "Venda nao editavel",
      );
    }

    const hasHeaderChange =
      input.memberId !== undefined ||
      input.percentageDiscount !== undefined ||
      input.discountValuetems !== undefined ||
      input.valueDiscountFinancial !== undefined ||
      input.percentageAcresce !== undefined ||
      input.valueAcresceItems !== undefined ||
      input.valueAcresceFinancial !== undefined ||
      input.valueLiquid !== undefined ||
      input.recalculateTotals === true;

    if (nextStatus === "FINALIZADA" && existing.type !== "VENDA") {
      throw new ValidationError(
        [{ path: "body.status", message: "Orcamento nao movimenta estoque ao finalizar" }],
        "Status invalido",
      );
    }

    const finalize = nextStatus === "FINALIZADA";
    const cancelSale =
      existing.type === "VENDA" && nextStatus === "CANCELADA";

    if (finalize && input.payments === undefined) {
      throw new ValidationError(
        [
          {
            path: "body.payments",
            message:
              "Informe pagamentos e parcelas ao finalizar a venda (status FINALIZADA)",
          },
        ],
        "Pagamentos obrigatorios",
      );
    }

    if (input.payments !== undefined && !finalize) {
      throw new ValidationError(
        [
          {
            path: "body.payments",
            message:
              "Pagamentos e parcelas so podem ser informados ao fechar a venda",
          },
        ],
        "Pagamentos invalidos",
      );
    }

    const completedionDate =
      input.completedionDate !== undefined
        ? input.completedionDate
        : finalize
          ? new Date()
          : undefined;

    const shouldRecalculateTotals =
      input.recalculateTotals === true ||
      (hasHeaderChange && input.valueLiquid === undefined);

    const subTotalForFinancial = decNum(existing.subTotal);

    let beforeRow!: typeof sales.$inferSelect;
    await db.transaction(async (tx) => {
      beforeRow = await this.getSaleRow(tx, enterpriseId, id);

      if (input.memberId !== undefined) {
        await this.assertClientMember(tx, enterpriseId, input.memberId);
      }

      let row = (
        await tx
          .update(sales)
          .set({
            ...(input.memberId !== undefined ? { memberId: input.memberId } : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.percentageDiscount !== undefined
              ? {
                  percentageDiscount: decPercentage(input.percentageDiscount),
                  valueDiscountFinancial: dec(
                    computeFinancialFromPercentage(
                      subTotalForFinancial,
                      input.percentageDiscount,
                    ),
                  ),
                }
              : {}),
            ...(input.discountValuetems !== undefined
              ? { discountValuetems: dec(input.discountValuetems) }
              : {}),
            ...(input.valueDiscountFinancial !== undefined &&
            input.percentageDiscount === undefined
              ? {
                  valueDiscountFinancial: dec(input.valueDiscountFinancial),
                  percentageDiscount: decPercentage(
                    computePercentageFromFinancial(
                      subTotalForFinancial,
                      input.valueDiscountFinancial,
                    ),
                  ),
                }
              : {}),
            ...(input.percentageAcresce !== undefined
              ? {
                  percentageAcresce: decPercentage(input.percentageAcresce),
                  valueAcresceFinancial: dec(
                    computeFinancialFromPercentage(
                      subTotalForFinancial,
                      input.percentageAcresce,
                    ),
                  ),
                }
              : {}),
            ...(input.valueAcresceItems !== undefined
              ? { valueAcresceItems: dec(input.valueAcresceItems) }
              : {}),
            ...(input.valueAcresceFinancial !== undefined &&
            input.percentageAcresce === undefined
              ? {
                  valueAcresceFinancial: dec(input.valueAcresceFinancial),
                  percentageAcresce: decPercentage(
                    computePercentageFromFinancial(
                      subTotalForFinancial,
                      input.valueAcresceFinancial,
                    ),
                  ),
                }
              : {}),
            ...(input.valueLiquid !== undefined
              ? { valueLiquid: input.valueLiquid.toString() }
              : {}),
            ...(completedionDate !== undefined
              ? { completedionDate }
              : {}),
            updatedAt: new Date(),
          })
          .where(this.scope(enterpriseId, id))
          .returning()
      )[0];
      if (!row) {
        throw new NotFoundError("Venda nao encontrada", "SALE_NOT_FOUND");
      }

      if (shouldRecalculateTotals && row.status === "ABERTA") {
        await this.recalculateSaleTotalsFromItems(tx, enterpriseId, id, row);
        row = (await this.getSaleRow(tx, enterpriseId, id))!;
      }

      const items = await tx
        .select()
        .from(salesItems)
        .where(eq(salesItems.salesId, id));

      if (finalize) {
        if (existing.type === "VENDA") {
          await assertSaleItemsStockCommitted(tx, id, items);
        }
        await this.assertSaleHasNoPayments(tx, id);
        this.assertSalePaymentsMatchSale(
          row.valueLiquid,
          row.createdAt,
          input.payments!,
        );
        await this.insertSalePayments(tx, id, input.payments!);
      }

      if (cancelSale) {
        for (const item of items) {
          await applySaleItemStockReturn(tx, {
            enterpriseId,
            userId,
            saleId: id,
            orderNumber: row.orderNumber,
            item,
          });
        }
      }
    });

    await this.recordSaleUpdateAudit(enterpriseId, id, beforeRow, audit);
    return this.getById(enterpriseId, id);
  }

  public async convertBudgetToSale(
    enterpriseId: string,
    budgetSaleId: string,
    sellerUserId: string | null,
    input: ConvertBudgetToSaleInput,
    audit: EntityAuditContext,
  ) {
    if (!sellerUserId) {
      throw new ValidationError(
        [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
        "Nao autenticado",
      );
    }

    const seller = await this.resolveSeller(sellerUserId);
    const status = input.status;

    const seenBudgetItemIds = new Set<string>();
    for (let i = 0; i < input.items.length; i++) {
      const item = input.items[i];
      if (seenBudgetItemIds.has(item.budgetItemId)) {
        throw new ValidationError(
          [
            {
              path: `body.items.${i}.budgetItemId`,
              message: "Item do orcamento duplicado na conversao",
            },
          ],
          "Itens invalidos",
        );
      }
      seenBudgetItemIds.add(item.budgetItemId);
    }

    try {
      let budgetBefore!: typeof sales.$inferSelect;
      const generatedSaleId = await db.transaction(async (tx) => {
        budgetBefore = await this.getSaleRow(tx, enterpriseId, budgetSaleId);
        const budget = budgetBefore;
        this.assertBudgetOpenForConversion(budget);

        if (!budget.memberId) {
          throw new ValidationError(
            [{ path: "params.saleId", message: "Orcamento sem cliente vinculado" }],
            "Cliente obrigatorio",
          );
        }

        const budgetItems = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, budgetSaleId));

        const budgetItemsById = new Map(
          budgetItems.map((item) => [item.id, item]),
        );

        const conversionLines: {
          budgetItem: typeof salesItems.$inferSelect;
          convertQuantity: number;
          itemInput: CreateSaleItemInput;
        }[] = [];

        for (let i = 0; i < input.items.length; i++) {
          const line = input.items[i];
          const budgetItem = budgetItemsById.get(line.budgetItemId);
          if (!budgetItem) {
            throw new ValidationError(
              [
                {
                  path: `body.items.${i}.budgetItemId`,
                  message: "Item nao pertence ao orcamento",
                },
              ],
              "Item invalido",
            );
          }

          const remaining =
            decNum(budgetItem.quantity) - decNum(budgetItem.quantityConverted);
          if (line.quantity > remaining + 1e-9) {
            throw new ValidationError(
              [
                {
                  path: `body.items.${i}.quantity`,
                  message: `Quantidade excede saldo restante (${remaining})`,
                },
              ],
              "Quantidade invalida",
            );
          }

          conversionLines.push({
            budgetItem,
            convertQuantity: line.quantity,
            itemInput: this.prorateItemFinancials(
              budgetItem,
              line.quantity,
              `body.items.${i}`,
            ),
          });
        }

        const orderNumber = await nextSaleOrderNumber(enterpriseId, tx);

        const [generatedSale] = await tx
          .insert(sales)
          .values({
            orderNumber,
            userId: seller.userId,
            userLegalName: seller.userLegalName,
            memberId: budget.memberId,
            type: "VENDA",
            subTotal: "0",
            percentageDiscount: decPercentage(input.percentageDiscount),
            discountValuetems: dec(input.discountValuetems),
            valueDiscountFinancial: dec(input.valueDiscountFinancial),
            percentageAcresce: decPercentage(input.percentageAcresce),
            valueAcresceItems: dec(input.valueAcresceItems),
            valueAcresceFinancial: dec(input.valueAcresceFinancial),
            valueLiquid: "0",
            status,
            sourceBudgetSaleId: budgetSaleId,
            completedionDate: status === "FINALIZADA" ? new Date() : null,
            enterprisesId: enterpriseId,
          })
          .returning();
        if (!generatedSale) throw new Error("Falha ao gerar venda do orcamento");

        const conversionItemRows: {
          budgetItemId: string;
          saleItemId: string;
          quantity: string;
        }[] = [];

        for (let i = 0; i < conversionLines.length; i++) {
          const { budgetItem, convertQuantity, itemInput } = conversionLines[i];

          await assertSaleItemStockAvailable(
            tx,
            enterpriseId,
            itemInput,
            `items.${i}`,
          );

          const [inserted] = await tx
            .insert(salesItems)
            .values({
              ...this.mapItemInputToInsert(generatedSale.id, itemInput),
              sourceBudgetItemId: budgetItem.id,
            })
            .returning();
          if (!inserted) throw new Error("Falha ao incluir item na venda gerada");

          await applySaleItemStockOut(tx, {
            enterpriseId,
            userId: sellerUserId,
            saleId: generatedSale.id,
            orderNumber: generatedSale.orderNumber,
            item: inserted,
          });

          const nextConverted =
            decNum(budgetItem.quantityConverted) + convertQuantity;
          await tx
            .update(salesItems)
            .set({
              quantityConverted: nextConverted.toString(),
              updatedAt: new Date(),
            })
            .where(eq(salesItems.id, budgetItem.id));

          budgetItem.quantityConverted = nextConverted.toString();

          conversionItemRows.push({
            budgetItemId: budgetItem.id,
            saleItemId: inserted.id,
            quantity: convertQuantity.toString(),
          });
        }

        await this.recalculateSaleTotalsFromItems(
          tx,
          enterpriseId,
          generatedSale.id,
          generatedSale,
        );

        if (status === "FINALIZADA" && input.payments?.length) {
          const updatedSale = await this.getSaleRow(
            tx,
            enterpriseId,
            generatedSale.id,
          );
          if (!updatedSale) throw new Error("Falha ao recalcular venda gerada");
          this.assertSalePaymentsMatchSale(
            updatedSale.valueLiquid,
            updatedSale.createdAt,
            input.payments,
          );
          await this.insertSalePayments(tx, generatedSale.id, input.payments);
        }

        const updatedBudgetItems = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, budgetSaleId));

        const budgetClosureSituation =
          this.computeBudgetClosureSituation(updatedBudgetItems);
        const closureKind: BudgetConversionKind =
          budgetClosureSituation === "FECHADO" ? "TOTAL" : "PARCIAL";

        await tx
          .update(sales)
          .set({
            budgetClosureSituation,
            updatedAt: new Date(),
          })
          .where(eq(sales.id, budgetSaleId));

        const [conversion] = await tx
          .insert(salesBudgetConversions)
          .values({
            enterprisesId: enterpriseId,
            budgetSaleId,
            generatedSaleId: generatedSale.id,
            closureKind,
            userId: seller.userId,
            userLegalName: seller.userLegalName,
          })
          .returning();
        if (!conversion) throw new Error("Falha ao registrar conversao");

        await tx.insert(salesBudgetConversionItems).values(
          conversionItemRows.map((row) => ({
            conversionId: conversion.id,
            budgetItemId: row.budgetItemId,
            saleItemId: row.saleItemId,
            quantity: row.quantity,
          })),
        );

        return generatedSale.id;
      });

      const generatedRow = await this.getSaleRow(db, enterpriseId, generatedSaleId);
      await recordCreateAudit({
        entityType: EntityTypes.SALES,
        entityId: generatedSaleId,
        after: toAuditRecord(generatedRow),
        ctx: { ...audit, enterpriseId },
      });
      const budgetAfter = await this.getSaleRow(db, enterpriseId, budgetSaleId);
      await recordEntityAudit({
        entityType: EntityTypes.SALES,
        entityId: budgetSaleId,
        action: "UPDATE",
        before: toAuditRecord(budgetBefore),
        after: toAuditRecord(budgetAfter),
        ctx: { ...audit, enterpriseId },
      });

      return this.getById(enterpriseId, generatedSaleId);
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Venda em conflito (numero do pedido)",
          "SALE_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async addItem(
    enterpriseId: string,
    saleId: string,
    userId: string | null,
    input: CreateSaleItemInput,
    audit: EntityAuditContext,
  ) {
    let beforeRow!: typeof sales.$inferSelect;
    await db.transaction(async (tx) => {
      beforeRow = await this.getSaleRow(tx, enterpriseId, saleId);
      const sale = beforeRow;
      this.assertBudgetEditableForItems(sale);

      if (sale.type === "VENDA") {
        await assertSaleItemStockAvailable(tx, enterpriseId, input, "body");
      } else {
        await validateSaleItemStock(enterpriseId, input, "body");
      }

      const [inserted] = await tx
        .insert(salesItems)
        .values(this.mapItemInputToInsert(saleId, input))
        .returning();
      if (!inserted) throw new Error("Falha ao incluir item na venda");

      if (sale.type === "VENDA") {
        await applySaleItemStockOut(tx, {
          enterpriseId,
          userId,
          saleId,
          orderNumber: sale.orderNumber,
          item: inserted,
        });
      }

      const updatedSale = await this.getSaleRow(tx, enterpriseId, saleId);
      await this.recalculateSaleTotalsFromItems(
        tx,
        enterpriseId,
        saleId,
        updatedSale,
      );
    });
    await this.recordSaleUpdateAudit(enterpriseId, saleId, beforeRow, audit);
    return this.getById(enterpriseId, saleId);
  }

  public async removeItem(
    enterpriseId: string,
    saleId: string,
    saleItemId: string,
    userId: string | null,
    audit: EntityAuditContext,
  ) {
    let beforeRow!: typeof sales.$inferSelect;
    await db.transaction(async (tx) => {
      beforeRow = await this.getSaleRow(tx, enterpriseId, saleId);
      const sale = beforeRow;
      this.assertBudgetEditableForItems(sale);

      const item = (
        await tx
          .select()
          .from(salesItems)
          .where(
            and(eq(salesItems.id, saleItemId), eq(salesItems.salesId, saleId)),
          )
          .limit(1)
      )[0];
      if (!item) {
        throw new NotFoundError(
          "Item da venda nao encontrado",
          "SALE_ITEM_NOT_FOUND",
        );
      }

      this.assertBudgetItemEditable(sale, item);

      if (sale.type === "VENDA") {
        await applySaleItemStockReturn(tx, {
          enterpriseId,
          userId,
          saleId,
          orderNumber: sale.orderNumber,
          item,
        });
      }

      await tx
        .delete(salesItems)
        .where(
          and(eq(salesItems.id, saleItemId), eq(salesItems.salesId, saleId)),
        );

      const updatedSale = await this.getSaleRow(tx, enterpriseId, saleId);
      await this.recalculateSaleTotalsFromItems(
        tx,
        enterpriseId,
        saleId,
        updatedSale,
      );
    });
    await this.recordSaleUpdateAudit(enterpriseId, saleId, beforeRow, audit);
    return this.getById(enterpriseId, saleId);
  }

  public async updateItem(
    enterpriseId: string,
    saleId: string,
    saleItemId: string,
    userId: string | null,
    input: PatchSaleItemInput,
    audit: EntityAuditContext,
  ) {
    let beforeRow!: typeof sales.$inferSelect;
    await db.transaction(async (tx) => {
      beforeRow = await this.getSaleRow(tx, enterpriseId, saleId);
      const sale = beforeRow;
      this.assertBudgetEditableForItems(sale);

      const existing = (
        await tx
          .select()
          .from(salesItems)
          .where(
            and(eq(salesItems.id, saleItemId), eq(salesItems.salesId, saleId)),
          )
          .limit(1)
      )[0];
      if (!existing) {
        throw new NotFoundError(
          "Item da venda nao encontrado",
          "SALE_ITEM_NOT_FOUND",
        );
      }

      const merged = this.mergeSaleItemPatch(existing, input);
      this.assertBudgetItemEditable(sale, existing, merged.quantity);

      if (sale.type === "VENDA") {
        await syncSaleItemStockOnUpdate(tx, {
          enterpriseId,
          userId,
          saleId,
          orderNumber: sale.orderNumber,
          oldItem: existing,
          newItem: merged,
        });
      } else {
        await validateSaleItemStock(enterpriseId, merged, "body");
      }

      await tx
        .update(salesItems)
        .set({
          quantity: merged.quantity.toString(),
          valueUnit: merged.valueUnit.toString(),
          valueDiscount: merged.valueDiscount.toString(),
          valueAcresce: merged.valueAcresce.toString(),
          valueTotal: merged.valueTotal.toString(),
          productsEnterprisesId: merged.productsEnterprisesId,
          unitid: merged.unitId,
          productTypeId: merged.productTypeId,
          stockSectorId: merged.stockSectorId ?? null,
          stockLocationId: merged.stockLocationId ?? null,
          stockBatchId: merged.stockBatchId ?? null,
          updatedAt: new Date(),
        })
        .where(
          and(eq(salesItems.id, saleItemId), eq(salesItems.salesId, saleId)),
        );

      const updatedSale = await this.getSaleRow(tx, enterpriseId, saleId);
      await this.recalculateSaleTotalsFromItems(
        tx,
        enterpriseId,
        saleId,
        updatedSale,
      );
    });
    await this.recordSaleUpdateAudit(enterpriseId, saleId, beforeRow, audit);
    return this.getById(enterpriseId, saleId);
  }
}

export const salesService = new SalesService();
