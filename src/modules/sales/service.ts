import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  notInArray,
  or,
  type SQL,
} from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  enterprisesMembers,
  paymentTypes,
  productTypes,
  productsEnterprises,
  sales,
  salesBudgetConversionItems,
  salesBudgetConversions,
  salesBudgetUnclosedItems,
  salesDues,
  salesItems,
  salesPayments,
  users,
} from "../../db/schema.js";
import {
  ConflictError,
  ForbiddenError,
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
import {
  getProductTypeCode,
  isServiceProductType,
  PRODUCT_TYPE_SERVICE_CODE,
} from "../../shared/products/product-type-service.js";
import { PERM } from "../auth/default-permissions.js";
import { isAllowed, resolvePermissions } from "../auth/permissions.js";
import { findPrimaryMemberDepartmentIdByMemberId } from "../auth/repository.js";
import {
  resolveDefaultSaleItemStockRefs,
} from "../stock/balance.js";
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
  resolveSaleClosingOrigin,
  type SaleOrigin,
} from "./sale-origin.js";
import {
  computeItemValueTotal,
  convertBudgetItemInputSchema,
  type ConvertBudgetToSaleInput,
  type CreateSaleInput,
  type CreateSaleItemInput,
  type ListSalesQuery,
  type PatchSaleInput,
  type PatchSaleItemInput,
  type SalePaymentInput,
} from "./schema.js";
import type { z } from "zod";

type ConvertBudgetItemLine = z.infer<typeof convertBudgetItemInputSchema>;

type BudgetClosureSituation = "ABERTO" | "PARCIAL" | "FECHADO";
type BudgetConversionKind = "PARCIAL" | "TOTAL";

const dec = (v: number | undefined | null) =>
  v !== undefined && v !== null ? v.toString() : null;

const decNum = (v: string | number | null | undefined) =>
  v !== undefined && v !== null && v !== "" ? Number(v) : 0;

const formatQuantity = (value: number) => value.toFixed(4);

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

/** Diferença máxima entre % derivado e valor em R$ (arredondamento de centavos). */
const FINANCIAL_ROUNDING_TOLERANCE = 0.02;

const resolveAdjustmentFinancial = (
  subTotal: number,
  percentage: string | null,
  storedValue: string | null,
): { value: number; percentage: string | null } => {
  const stored = decNum(storedValue);
  if (hasStoredPercentage(percentage)) {
    const pct = decNum(percentage);
    const fromPct = computeFinancialFromPercentage(subTotal, pct);
    if (
      stored > 0 &&
      Math.abs(stored - fromPct) <= FINANCIAL_ROUNDING_TOLERANCE
    ) {
      return { value: stored, percentage: null };
    }
    return { value: fromPct, percentage };
  }

  return {
    value: stored,
    percentage: null,
  };
};

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
  const discount = resolveAdjustmentFinancial(
    subTotal,
    sale.percentageDiscount,
    sale.valueDiscountFinancial,
  );
  const acresce = resolveAdjustmentFinancial(
    subTotal,
    sale.percentageAcresce,
    sale.valueAcresceFinancial,
  );

  return {
    valueDiscountFinancial: discount.value,
    percentageDiscount: discount.percentage,
    valueAcresceFinancial: acresce.value,
    percentageAcresce: acresce.percentage,
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

export type SaleAuthContext = {
  userId: string;
  memberId?: string;
  memberDepartmentId?: string;
};

const SELLER_INELIGIBLE_MEMBER_CLASSES = ["CLIENTE", "FORNECEDOR"] as const;

const saleWithMemberSelect = { 
  id: sales.id,
  orderNumber: sales.orderNumber,
  userId: sales.userId,
  userLegalName: sales.userLegalName,
  sellerId: sales.sellerId,
  sellerLegalName: sales.sellerLegalName,
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
  origin: sales.origin,
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
    if (query?.sellerId) {
      filters.push(
        or(
          eq(sales.sellerId, query.sellerId),
          eq(sales.userId, query.sellerId),
        )!,
      );
    }
    if (query?.orderNumber !== undefined) {
      filters.push(eq(sales.orderNumber, query.orderNumber));
    }
    if (query?.seller) {
      filters.push(ilike(sales.sellerLegalName, `%${query.seller}%`));
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
    if (budget.status === "CANCELADA") {
      throw new ValidationError(
        [
          {
            path: "params.saleId",
            message: "Orcamento cancelado nao pode ser convertido",
          },
        ],
        "Orcamento cancelado",
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

  private async resolveConversionItemInput(
    tx: Tx,
    enterpriseId: string,
    budgetItem: typeof salesItems.$inferSelect,
    convertQuantity: number,
    itemPath: string,
    line?: ConvertBudgetItemLine,
  ): Promise<CreateSaleItemInput> {
    const base = this.prorateItemFinancials(
      budgetItem,
      convertQuantity,
      itemPath,
    );

    const typeCode = await getProductTypeCode(budgetItem.productTypeId);
    if (typeCode && isServiceProductType(typeCode)) {
      return base;
    }

    let stockSectorId =
      line?.stockSectorId ?? budgetItem.stockSectorId ?? undefined;
    let stockLocationId =
      line?.stockLocationId ?? budgetItem.stockLocationId ?? undefined;
    let stockBatchId =
      line?.stockBatchId !== undefined
        ? line.stockBatchId ?? undefined
        : budgetItem.stockBatchId ?? undefined;

    if (!stockSectorId || !stockLocationId) {
      const defaults = await resolveDefaultSaleItemStockRefs(
        enterpriseId,
        budgetItem.productsEnterprisesId,
        tx,
        itemPath,
      );
      stockSectorId = stockSectorId ?? defaults.stockSectorId;
      stockLocationId = stockLocationId ?? defaults.stockLocationId;
      if (stockBatchId === undefined) {
        stockBatchId = defaults.stockBatchId ?? undefined;
      }
    }

    return {
      ...base,
      stockSectorId,
      stockLocationId,
      stockBatchId,
    };
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

  private mapItemInputToInsert(
    saleId: string,
    item: CreateSaleItemInput,
    actor: {
      userId: string;
      userLegalName: string;
      sellerId: string;
      sellerLegalName: string;
    },
    origin: SaleOrigin,
  ) {
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
      userId: actor.userId,
      userLegalName: actor.userLegalName,
      sellerId: actor.sellerId,
      sellerLegalName: actor.sellerLegalName,
      PercentageComissionSeller: "0.00",
      PercentageComissionManager: "0.00",
      origin,
    };
  }

  private async loadSellerMember(
    tx: Tx | typeof db,
    enterpriseId: string,
    sellerUserId: string,
  ) {
    const row = (
      await tx
        .select({
          id: enterprisesMembers.id,
          saleLimit: enterprisesMembers.saleLimit,
          exceedDiscountSale: enterprisesMembers.exceedDiscountSale,
          comissionOnSight: enterprisesMembers.comissionOnSight,
          comissionToTerms: enterprisesMembers.comissionToTerms,
          comissionPartial: enterprisesMembers.comissionPartial,
        })
        .from(enterprisesMembers)
        .where(
          and(
            eq(enterprisesMembers.userId, sellerUserId),
            eq(enterprisesMembers.enterpriseId, enterpriseId),
            eq(enterprisesMembers.status, "ATIVO"),
            isNull(enterprisesMembers.deletedAt),
            notInArray(
              enterprisesMembers.class,
              [...SELLER_INELIGIBLE_MEMBER_CLASSES],
            ),
          ),
        )
        .limit(1)
    )[0];

    if (!row) {
      throw new ValidationError(
        [
          {
            path: "body.sellerId",
            message:
              "Vendedor deve ser membro ativo da empresa (nao cliente ou fornecedor)",
          },
        ],
        "Vendedor invalido",
      );
    }

    return row;
  }

  private assertSaleDiscountWithinMemberLimit(
    member: { saleLimit: string; exceedDiscountSale: boolean },
    totals: {
      subTotal: number;
      discountValuetems: number;
      valueDiscountFinancial: number;
    },
    path = "body",
  ) {
    if (member.exceedDiscountSale) return;
    if (totals.subTotal <= 0) return;

    const totalDiscount = roundMoney(
      totals.discountValuetems + totals.valueDiscountFinancial,
    );
    const effectivePct = computePercentageFromFinancial(
      totals.subTotal,
      totalDiscount,
    );
    const limit = decNum(member.saleLimit);

    if (effectivePct > limit) {
      throw new ValidationError(
        [
          {
            path,
            message: `Desconto total (itens + financeiro) de ${effectivePct}% excede o limite do vendedor (${limit}%)`,
          },
        ],
        "Desconto excede limite do membro",
      );
    }
  }

  private async assertSaleDiscountWithinMemberLimitForSeller(
    tx: Tx | typeof db,
    enterpriseId: string,
    sellerUserId: string,
    totals: {
      subTotal: number;
      discountValuetems: number;
      valueDiscountFinancial: number;
    },
    path = "body",
  ) {
    const member = await this.loadSellerMember(tx, enterpriseId, sellerUserId);
    this.assertSaleDiscountWithinMemberLimit(member, totals, path);
  }

  private assertItemLineDiscountWithinMemberLimit(
    member: { saleLimit: string; exceedDiscountSale: boolean },
    item: { quantity: number; valueUnit: number; valueDiscount: number },
    path = "body.valueDiscount",
  ) {
    if (member.exceedDiscountSale) return;

    const lineSubTotal = roundMoney(item.quantity * item.valueUnit);
    if (lineSubTotal <= 0) return;

    const linePct = computePercentageFromFinancial(
      lineSubTotal,
      item.valueDiscount,
    );
    const limit = decNum(member.saleLimit);

    if (linePct > limit) {
      throw new ValidationError(
        [
          {
            path,
            message: `Desconto do item (${linePct}%) excede o limite do vendedor (${limit}%)`,
          },
        ],
        "Desconto excede limite do membro",
      );
    }
  }

  private async assertItemLineDiscountWithinMemberLimitForSeller(
    tx: Tx | typeof db,
    enterpriseId: string,
    sellerUserId: string,
    item: { quantity: number; valueUnit: number; valueDiscount: number },
    path = "body.valueDiscount",
  ) {
    const member = await this.loadSellerMember(tx, enterpriseId, sellerUserId);
    this.assertItemLineDiscountWithinMemberLimit(member, item, path);
  }

  private resolveMemberCommissionRate(
    member: {
      comissionOnSight: string;
      comissionToTerms: string;
      comissionPartial: string;
    },
    paymentKinds: Array<(typeof paymentTypes.$inferSelect)["paymentType"]>,
  ): string {
    const uniqueKinds = new Set(paymentKinds);

    if (uniqueKinds.size === 1 && uniqueKinds.has("A_VISTA")) {
      return member.comissionOnSight;
    }
    if (uniqueKinds.size === 1 && uniqueKinds.has("A_PRAZO")) {
      return member.comissionToTerms;
    }

    return member.comissionPartial;
  }

  private async applySaleItemsCommission(
    tx: Tx,
    saleId: string,
    rate: string,
  ) {
    await tx
      .update(salesItems)
      .set({
        PercentageComissionSeller: rate,
        PercentageComissionManager: "0.00",
        updatedAt: new Date(),
      })
      .where(eq(salesItems.salesId, saleId));
  }

  private async recalculateSaleItemsCommission(
    tx: Tx,
    saleId: string,
    sellerUserId: string,
    enterpriseId: string,
    payments: SalePaymentInput[],
  ) {
    const member = await this.loadSellerMember(tx, enterpriseId, sellerUserId);
    const paymentTypeIds = payments.map((payment) => payment.paymentTypeId);
    const rows = await tx
      .select({ paymentType: paymentTypes.paymentType })
      .from(paymentTypes)
      .where(inArray(paymentTypes.id, paymentTypeIds));

    const rate = this.resolveMemberCommissionRate(
      member,
      rows.map((row) => row.paymentType),
    );
    await this.applySaleItemsCommission(tx, saleId, rate);
  }

  private resolveItemLaunchOrigin(
    itemOrigin: SaleOrigin | undefined,
    gescomClient?: string | string[],
  ): SaleOrigin {
    return resolveSaleClosingOrigin(itemOrigin, gescomClient);
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
    return roundMoney(
      Math.max(
        0,
        subTotal -
          decNum(sale.discountValuetems) -
          decNum(sale.valueDiscountFinancial) +
          decNum(sale.valueAcresceItems) +
          decNum(sale.valueAcresceFinancial),
      ),
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
      const totals = await this.recalculateSaleTotalsFromItems(
        tx,
        enterpriseId,
        saleId,
        sale,
      );
      await this.assertSaleDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        sale.sellerId,
        totals,
      );
    });
    await this.recordSaleUpdateAudit(enterpriseId, saleId, beforeRow, audit);
    return this.getById(enterpriseId, saleId);
  }

  private async resolveSeller(
    userId: string,
  ): Promise<{ userId: string; userLegalName: string }> {
    const row = (
      await db
        .select({ id: users.id, userName: users.userName })
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
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

  private async assertSellerInEnterprise(
    enterpriseId: string,
    sellerUserId: string,
  ) {
    const row = (
      await db
        .select({ id: enterprisesMembers.id })
        .from(enterprisesMembers)
        .where(
          and(
            eq(enterprisesMembers.userId, sellerUserId),
            eq(enterprisesMembers.enterpriseId, enterpriseId),
            eq(enterprisesMembers.status, "ATIVO"),
            isNull(enterprisesMembers.deletedAt),
            notInArray(
              enterprisesMembers.class,
              [...SELLER_INELIGIBLE_MEMBER_CLASSES],
            ),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new ValidationError(
        [
          {
            path: "body.sellerId",
            message:
              "Vendedor deve ser membro ativo da empresa (nao cliente ou fornecedor)",
          },
        ],
        "Vendedor invalido",
      );
    }
  }

  private async assertCanAssignSeller(
    auth: SaleAuthContext,
    sellerUserId: string,
  ) {
    if (sellerUserId === auth.userId) return;

    let memberDepartmentId = auth.memberDepartmentId;
    if (!memberDepartmentId && auth.memberId) {
      memberDepartmentId =
        (await findPrimaryMemberDepartmentIdByMemberId(auth.memberId)) ??
        undefined;
    }
    if (!memberDepartmentId) {
      throw new ForbiddenError(
        "Sem permissao para atribuir outro vendedor",
        "PERMISSION_DENIED",
      );
    }
    const resolved = await resolvePermissions(memberDepartmentId);
    if (!isAllowed(resolved, PERM.alterar_vendas)) {
      throw new ForbiddenError(
        "Sem permissao para atribuir outro vendedor",
        "PERMISSION_DENIED",
      );
    }
  }

  private async resolveSaleSeller(
    auth: SaleAuthContext,
    enterpriseId: string,
    requestedSellerId?: string,
    defaultSellerId?: string,
  ): Promise<{ sellerId: string; sellerLegalName: string }> {
    const sellerUserId = requestedSellerId ?? defaultSellerId ?? auth.userId;
    await this.assertCanAssignSeller(auth, sellerUserId);
    await this.assertSellerInEnterprise(enterpriseId, sellerUserId);
    const seller = await this.resolveSeller(sellerUserId);
    return {
      sellerId: seller.userId,
      sellerLegalName: seller.userLegalName,
    };
  }

  private async resolveItemActor(
    auth: SaleAuthContext,
    enterpriseId: string,
    sale: Pick<typeof sales.$inferSelect, "sellerId">,
    itemSellerId?: string,
  ): Promise<{
    userId: string;
    userLegalName: string;
    sellerId: string;
    sellerLegalName: string;
  }> {
    const operator = await this.resolveSeller(auth.userId);
    const seller = await this.resolveSaleSeller(
      auth,
      enterpriseId,
      itemSellerId,
      sale.sellerId,
    );
    return {
      userId: operator.userId,
      userLegalName: operator.userLegalName,
      sellerId: seller.sellerId,
      sellerLegalName: seller.sellerLegalName,
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
    const [conversionItems, unclosedItems] = await Promise.all([
      db
        .select()
        .from(salesBudgetConversionItems)
        .where(inArray(salesBudgetConversionItems.conversionId, conversionIds)),
      db
        .select()
        .from(salesBudgetUnclosedItems)
        .where(inArray(salesBudgetUnclosedItems.conversionId, conversionIds)),
    ]);

    return {
      items: conversions.map((conversion) => ({
        ...conversion,
        items: conversionItems.filter(
          (item) => item.conversionId === conversion.id,
        ),
        unclosedItems: unclosedItems.filter(
          (item) => item.conversionId === conversion.id,
        ),
      })),
    };
  }

  public async create(
    enterpriseId: string,
    auth: SaleAuthContext | null,
    input: CreateSaleInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    if (!auth?.userId) {
      throw new ValidationError(
        [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
        "Nao autenticado",
      );
    }
    const operator = await this.resolveSeller(auth.userId);
    const seller = await this.resolveSaleSeller(
      auth,
      enterpriseId,
      input.sellerId,
    );

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

        const closingOrigin =
          status === "FINALIZADA"
            ? resolveSaleClosingOrigin(input.origin, gescomClient)
            : undefined;

        const [sale] = await tx
          .insert(sales)
          .values({
            orderNumber,
            userId: operator.userId,
            userLegalName: operator.userLegalName,
            sellerId: seller.sellerId,
            sellerLegalName: seller.sellerLegalName,
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
            ...(closingOrigin !== undefined ? { origin: closingOrigin } : {}),
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

          const actor = await this.resolveItemActor(
            auth,
            enterpriseId,
            sale,
            itemInput.sellerId,
          );

          await this.assertItemLineDiscountWithinMemberLimitForSeller(
            tx,
            enterpriseId,
            actor.sellerId,
            {
              quantity: itemInput.quantity,
              valueUnit: itemInput.valueUnit,
              valueDiscount: itemInput.valueDiscount,
            },
            `items.${i}.valueDiscount`,
          );

          const [inserted] = await tx
            .insert(salesItems)
            .values(
              this.mapItemInputToInsert(
                sale.id,
                itemInput,
                actor,
                this.resolveItemLaunchOrigin(itemInput.origin, gescomClient),
              ),
            )
            .returning();
          if (!inserted) throw new Error("Falha ao incluir item na venda");

          if (input.type === "VENDA") {
            await applySaleItemStockOut(tx, {
              enterpriseId,
              userId: auth.userId,
              saleId: sale.id,
              orderNumber: sale.orderNumber,
              item: inserted,
            });
          }
        }

        const totals = await this.recalculateSaleTotalsFromItems(
          tx,
          enterpriseId,
          sale.id,
          sale,
        );
        await this.assertSaleDiscountWithinMemberLimitForSeller(
          tx,
          enterpriseId,
          seller.sellerId,
          totals,
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
          await this.recalculateSaleItemsCommission(
            tx,
            sale.id,
            seller.sellerId,
            enterpriseId,
            input.payments,
          );
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
    auth: SaleAuthContext | null,
    input: PatchSaleInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
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

    let sellerUpdate: { sellerId: string; sellerLegalName: string } | undefined;
    if (input.sellerId !== undefined) {
      if (!auth?.userId) {
        throw new ValidationError(
          [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
          "Nao autenticado",
        );
      }
      sellerUpdate = await this.resolveSaleSeller(
        auth,
        enterpriseId,
        input.sellerId,
      );
    }

    const hasHeaderChange =
      input.memberId !== undefined ||
      input.sellerId !== undefined ||
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
    const closingOrigin = finalize
      ? resolveSaleClosingOrigin(input.origin, gescomClient)
      : undefined;
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
            ...(sellerUpdate
              ? {
                  sellerId: sellerUpdate.sellerId,
                  sellerLegalName: sellerUpdate.sellerLegalName,
                }
              : {}),
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(typeof input.percentageDiscount === "number"
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
            ...(input.percentageDiscount === null
              ? { percentageDiscount: null }
              : {}),
            ...(input.discountValuetems !== undefined
              ? { discountValuetems: dec(input.discountValuetems) }
              : {}),
            ...(input.valueDiscountFinancial !== undefined
              ? {
                  valueDiscountFinancial: dec(input.valueDiscountFinancial),
                  ...(typeof input.percentageDiscount !== "number"
                    ? { percentageDiscount: null }
                    : {}),
                }
              : {}),
            ...(typeof input.percentageAcresce === "number"
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
            ...(input.percentageAcresce === null
              ? { percentageAcresce: null }
              : {}),
            ...(input.valueAcresceItems !== undefined
              ? { valueAcresceItems: dec(input.valueAcresceItems) }
              : {}),
            ...(input.valueAcresceFinancial !== undefined
              ? {
                  valueAcresceFinancial: dec(input.valueAcresceFinancial),
                  ...(typeof input.percentageAcresce !== "number"
                    ? { percentageAcresce: null }
                    : {}),
                }
              : {}),
            ...(input.valueLiquid !== undefined
              ? { valueLiquid: input.valueLiquid.toString() }
              : {}),
            ...(completedionDate !== undefined
              ? { completedionDate }
              : {}),
            ...(closingOrigin !== undefined ? { origin: closingOrigin } : {}),
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

      if (row.status === "ABERTA") {
        await this.assertSaleDiscountWithinMemberLimitForSeller(
          tx,
          enterpriseId,
          sellerUpdate?.sellerId ?? row.sellerId,
          {
            subTotal: decNum(row.subTotal),
            discountValuetems: decNum(row.discountValuetems),
            valueDiscountFinancial: decNum(row.valueDiscountFinancial),
          },
        );
      }

      const items = await tx
        .select()
        .from(salesItems)
        .where(eq(salesItems.salesId, id));

      if (finalize) {
        if (existing.type === "VENDA") {
          for (const item of items) {
            await applySaleItemStockOut(tx, {
              enterpriseId,
              userId: auth?.userId ?? null,
              saleId: id,
              orderNumber: row.orderNumber,
              item,
            });
          }
          await assertSaleItemsStockCommitted(tx, id, items);
        }
        await this.assertSaleHasNoPayments(tx, id);
        this.assertSalePaymentsMatchSale(
          row.valueLiquid,
          row.createdAt,
          input.payments!,
        );
        await this.insertSalePayments(tx, id, input.payments!);
        await this.recalculateSaleItemsCommission(
          tx,
          id,
          sellerUpdate?.sellerId ?? existing.sellerId,
          enterpriseId,
          input.payments!,
        );
      }

      if (cancelSale) {
        for (const item of items) {
          await applySaleItemStockReturn(tx, {
            enterpriseId,
            userId: auth?.userId ?? null,
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
    auth: SaleAuthContext | null,
    input: ConvertBudgetToSaleInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    if (!auth?.userId) {
      throw new ValidationError(
        [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
        "Nao autenticado",
      );
    }

    const operator = await this.resolveSeller(auth.userId);
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
          line: (typeof input.items)[number];
          itemIndex: number;
        }[] = [];
        const unclosedRows: {
          budgetItemId: string;
          quantityNotConverted: number;
          justification: string;
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

          if (line.quantity < remaining - 1e-9) {
            const justification = line.unclosedJustification?.trim();
            if (justification) {
              unclosedRows.push({
                budgetItemId: budgetItem.id,
                quantityNotConverted: remaining - line.quantity,
                justification,
              });
            }
          }

          if (line.quantity > 0) {
            conversionLines.push({
              budgetItem,
              convertQuantity: line.quantity,
              line,
              itemIndex: i,
            });
          }
        }

        const memberId = input.memberId ?? budget.memberId;
        if (!memberId) {
          throw new ValidationError(
            [{ path: "params.saleId", message: "Orcamento sem cliente vinculado" }],
            "Cliente obrigatorio",
          );
        }
        await this.assertClientMember(tx, enterpriseId, memberId);

        const orderNumber = await nextSaleOrderNumber(enterpriseId, tx);

        const seller = await this.resolveSaleSeller(
          auth,
          enterpriseId,
          input.sellerId,
          budget.sellerId,
        );

        const closingOrigin =
          status === "FINALIZADA"
            ? resolveSaleClosingOrigin(input.origin, gescomClient)
            : undefined;

        const [generatedSale] = await tx
          .insert(sales)
          .values({
            orderNumber,
            userId: operator.userId,
            userLegalName: operator.userLegalName,
            sellerId: seller.sellerId,
            sellerLegalName: seller.sellerLegalName,
            memberId,
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
            budgetClosureSituation: "FECHADO",
            sourceBudgetSaleId: budgetSaleId,
            ...(closingOrigin !== undefined ? { origin: closingOrigin } : {}),
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
          const { budgetItem, convertQuantity, line, itemIndex } =
            conversionLines[i];
          const itemPath = `body.items.${itemIndex}`;
          const itemInput = await this.resolveConversionItemInput(
            tx,
            enterpriseId,
            budgetItem,
            convertQuantity,
            itemPath,
            line,
          );

          await assertSaleItemStockAvailable(
            tx,
            enterpriseId,
            itemInput,
            itemPath,
          );

          const actor = await this.resolveItemActor(
            auth,
            enterpriseId,
            generatedSale,
          );

          await this.assertItemLineDiscountWithinMemberLimitForSeller(
            tx,
            enterpriseId,
            actor.sellerId,
            {
              quantity: itemInput.quantity,
              valueUnit: itemInput.valueUnit,
              valueDiscount: itemInput.valueDiscount,
            },
            `${itemPath}.valueDiscount`,
          );

          const [inserted] = await tx
            .insert(salesItems)
            .values({
              ...this.mapItemInputToInsert(
                generatedSale.id,
                itemInput,
                actor,
                this.resolveItemLaunchOrigin(itemInput.origin, gescomClient),
              ),
              sourceBudgetItemId: budgetItem.id,
              quantityConverted: formatQuantity(convertQuantity),
            })
            .returning();
          if (!inserted) throw new Error("Falha ao incluir item na venda gerada");

          await applySaleItemStockOut(tx, {
            enterpriseId,
            userId: auth.userId,
            saleId: generatedSale.id,
            orderNumber: generatedSale.orderNumber,
            item: inserted,
          });

          const nextConverted =
            decNum(budgetItem.quantityConverted) + convertQuantity;
          const [updatedBudgetItem] = await tx
            .update(salesItems)
            .set({
              quantityConverted: formatQuantity(nextConverted),
              updatedAt: new Date(),
            })
            .where(eq(salesItems.id, budgetItem.id))
            .returning({ id: salesItems.id });
          if (!updatedBudgetItem) {
            throw new Error(
              `Falha ao atualizar quantityConverted do item ${budgetItem.id}`,
            );
          }

          budgetItem.quantityConverted = formatQuantity(nextConverted);

          conversionItemRows.push({
            budgetItemId: budgetItem.id,
            saleItemId: inserted.id,
            quantity: formatQuantity(convertQuantity),
          });
        }

        const totals = await this.recalculateSaleTotalsFromItems(
          tx,
          enterpriseId,
          generatedSale.id,
          generatedSale,
        );
        await this.assertSaleDiscountWithinMemberLimitForSeller(
          tx,
          enterpriseId,
          seller.sellerId,
          totals,
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
          await this.recalculateSaleItemsCommission(
            tx,
            generatedSale.id,
            seller.sellerId,
            enterpriseId,
            input.payments,
          );
        }

        const updatedBudgetItems = await tx
          .select()
          .from(salesItems)
          .where(eq(salesItems.salesId, budgetSaleId));

        const computedClosureSituation =
          this.computeBudgetClosureSituation(updatedBudgetItems);
        const closureKind: BudgetConversionKind =
          computedClosureSituation === "FECHADO" ? "TOTAL" : "PARCIAL";

        await tx
          .update(sales)
          .set({
            budgetClosureSituation: computedClosureSituation,
            status: "FINALIZADA",
            completedionDate: new Date(),
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
            userId: operator.userId,
            userLegalName: operator.userLegalName,
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

        if (unclosedRows.length > 0) {
          await tx.insert(salesBudgetUnclosedItems).values(
            unclosedRows.map((row) => ({
              conversionId: conversion.id,
              budgetItemId: row.budgetItemId,
              quantityNotConverted: row.quantityNotConverted.toString(),
              justification: row.justification,
              userId: operator.userId,
              userLegalName: operator.userLegalName,
            })),
          );
        }

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
    auth: SaleAuthContext | null,
    input: CreateSaleItemInput,
    audit: EntityAuditContext,
    gescomClient?: string | string[],
  ) {
    if (!auth?.userId) {
      throw new ValidationError(
        [{ path: "auth", message: "Usuario autenticado obrigatorio" }],
        "Nao autenticado",
      );
    }

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

      const actor = await this.resolveItemActor(
        auth,
        enterpriseId,
        sale,
        input.sellerId,
      );

      await this.assertItemLineDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        actor.sellerId,
        {
          quantity: input.quantity,
          valueUnit: input.valueUnit,
          valueDiscount: input.valueDiscount,
        },
        "body.valueDiscount",
      );

      const [inserted] = await tx
        .insert(salesItems)
        .values(
          this.mapItemInputToInsert(
            saleId,
            input,
            actor,
            this.resolveItemLaunchOrigin(input.origin, gescomClient),
          ),
        )
        .returning();
      if (!inserted) throw new Error("Falha ao incluir item na venda");

      if (sale.type === "VENDA") {
        await applySaleItemStockOut(tx, {
          enterpriseId,
          userId: auth.userId,
          saleId,
          orderNumber: sale.orderNumber,
          item: inserted,
        });
      }

      const updatedSale = await this.getSaleRow(tx, enterpriseId, saleId);
      const totals = await this.recalculateSaleTotalsFromItems(
        tx,
        enterpriseId,
        saleId,
        updatedSale,
      );
      await this.assertSaleDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        updatedSale.sellerId,
        totals,
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
      const totals = await this.recalculateSaleTotalsFromItems(
        tx,
        enterpriseId,
        saleId,
        updatedSale,
      );
      await this.assertSaleDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        updatedSale.sellerId,
        totals,
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

      await this.assertItemLineDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        existing.sellerId,
        {
          quantity: merged.quantity,
          valueUnit: merged.valueUnit,
          valueDiscount: merged.valueDiscount,
        },
        "body.valueDiscount",
      );

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
      const totals = await this.recalculateSaleTotalsFromItems(
        tx,
        enterpriseId,
        saleId,
        updatedSale,
      );
      await this.assertSaleDiscountWithinMemberLimitForSeller(
        tx,
        enterpriseId,
        updatedSale.sellerId,
        totals,
      );
    });
    await this.recordSaleUpdateAudit(enterpriseId, saleId, beforeRow, audit);
    return this.getById(enterpriseId, saleId);
  }
}

export const salesService = new SalesService();
