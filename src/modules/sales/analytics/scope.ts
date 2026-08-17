import { and, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import {
  sales,
  salesDues,
  salesItems,
  salesPayments,
  salesReturns,
} from "../../../db/schema.js";
import { timezoneSqlLiteral, type ResolvedPeriod } from "./period.js";

export type AnalyticsFilters = {
  sellerId?: string;
  memberId?: string;
  paymentTypeId?: string;
  productsEnterprisesId?: string;
  productGroupId?: string;
};

/** Data efetiva de conclusao (completedionDate ou fallback createdAt no fuso). */
export const effectiveCompletionDateSql = (timezone: string) =>
  sql`COALESCE(${sales.completedionDate}, DATE(timezone(${timezoneSqlLiteral(timezone)}, ${sales.createdAt})))`;

/** Data local de criacao do pedido. */
export const localCreatedDateSql = (timezone: string) =>
  sql`DATE(timezone(${timezoneSqlLiteral(timezone)}, ${sales.createdAt}))`;

/** Data local de criacao da devolucao. */
export const localReturnCreatedDateSql = (timezone: string) =>
  sql`DATE(timezone(${timezoneSqlLiteral(timezone)}, ${salesReturns.createdAt}))`;

/** Data de calendario UTC da parcela (dueDate e date-only armazenado em UTC). */
export const dueDateUtcSql = () =>
  sql`DATE(timezone('UTC', ${salesDues.dueDate}))`;

/** Data de reconhecimento financeiro (vencimento da parcela). */
export const effectiveRecognizedDateSql = (_timezone?: string) =>
  dueDateUtcSql();

/** Valor reconhecido no dia: valor da parcela. */
export const recognizedAmountSql = () =>
  sql`coalesce(${salesDues.valueInstallment}, 0)`;

/**
 * Fracao da venda representada pelo valor reconhecido.
 * Usada para ratear pecas/servico, desconto, quantidade e custo na parcela.
 */
export const recognizedFractionSql = () =>
  sql`case
    when coalesce(${sales.valueLiquid}, 0) > 0
    then ${recognizedAmountSql()} / ${sales.valueLiquid}
    else 0
  end`;

/** Custo bruto da venda (quantidade original × custo unitario). */
export const saleGrossCostSql = () =>
  sql`coalesce((
    SELECT sum(
      coalesce(si.quantity, 0)
      * coalesce(si.average_cost, si.actual_real_cost, si.price_cost, 0)
    )
    FROM sales_items si
    WHERE si.sales_id = ${sales.id}
  ), 0)`;

/** Custo da parcela (custo da venda × fracao reconhecida). */
export const recognizedCostSql = () =>
  sql`${saleGrossCostSql()} * ${recognizedFractionSql()}`;

/** Receita de pecas rateada na parcela. */
export const recognizedPieRevenueSql = () =>
  sql`coalesce(${sales.valuePie}, 0) * ${recognizedFractionSql()}`;

/** Receita de servicos rateada na parcela. */
export const recognizedServiceRevenueSql = () =>
  sql`coalesce(${sales.valueService}, 0) * ${recognizedFractionSql()}`;

/** Desconto rateado na parcela. */
export const recognizedDiscountSql = () =>
  sql`(
    coalesce(${sales.discountValuetems}, 0)
    + coalesce(${sales.valueDiscountFinancialPie}, 0)
    + coalesce(${sales.valueDiscountFinancialService}, 0)
  ) * ${recognizedFractionSql()}`;

/** Condicao de data de realizacao da venda (conclusao do documento). */
export const buildRealizedDateCondition = (
  period: ResolvedPeriod,
): SQL | undefined => {
  const effective = effectiveCompletionDateSql(period.timezone);
  return and(
    gte(effective, sql`${period.from}::date`),
    lte(effective, sql`${period.to}::date`),
  );
};

/** Condicao de data de reconhecimento financeiro (vencimento da parcela). */
export const buildRecognizedDateCondition = (
  period: ResolvedPeriod,
): SQL | undefined => {
  const recognized = effectiveRecognizedDateSql(period.timezone);
  return and(
    gte(recognized, sql`${period.from}::date`),
    lte(recognized, sql`${period.to}::date`),
  );
};

/** Condicao de data de pipeline da venda. */
export const buildPipelineDateCondition = (
  period: ResolvedPeriod,
): SQL | undefined => {
  const localDate = localCreatedDateSql(period.timezone);
  return and(
    gte(localDate, sql`${period.from}::date`),
    lte(localDate, sql`${period.to}::date`),
  );
};

/** Condicao de data de devolucao da venda. */
export const buildReturnDateCondition = (
  period: ResolvedPeriod,
): SQL | undefined => {
  const localDate = localReturnCreatedDateSql(period.timezone);
  return and(
    gte(localDate, sql`${period.from}::date`),
    lte(localDate, sql`${period.to}::date`),
  );
};

/** Filtros de documento sem forma de pagamento (vendedor, cliente, produto). */
export const buildSaleDocumentFilterConditions = (
  filters: AnalyticsFilters,
): SQL[] => {
  const conditions: SQL[] = [];
  if (filters.sellerId) {
    conditions.push(eq(sales.sellerId, filters.sellerId));
  }
  if (filters.memberId) {
    conditions.push(eq(sales.memberId, filters.memberId));
  }
  if (filters.productsEnterprisesId) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${salesItems}
        WHERE ${salesItems.salesId} = ${sales.id}
        AND ${salesItems.productsEnterprisesId} = ${filters.productsEnterprisesId}
      )`,
    );
  }
  if (filters.productGroupId) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${salesItems}
        INNER JOIN products_enterprises pe ON pe.id = ${salesItems.productsEnterprisesId}
        WHERE ${salesItems.salesId} = ${sales.id}
        AND pe.product_group_id = ${filters.productGroupId}
      )`,
    );
  }
  return conditions;
};

/** Filtro de forma de pagamento na parcela (nao no documento inteiro). */
export const buildDuePaymentFilterConditions = (
  filters: AnalyticsFilters,
): SQL[] => {
  if (!filters.paymentTypeId) return [];
  return [
    sql`EXISTS (
      SELECT 1 FROM ${salesPayments}
      WHERE ${salesPayments.id} = ${salesDues.salesPaymentId}
      AND ${salesPayments.paymentTypeId} = ${filters.paymentTypeId}
    )`,
  ];
};

/** Condicoes de filtro de venda (nivel documento). */
export const buildSaleFilterConditions = (filters: AnalyticsFilters): SQL[] => {
  const conditions = buildSaleDocumentFilterConditions(filters);
  if (filters.paymentTypeId) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM ${salesPayments}
        WHERE ${salesPayments.salesId} = ${sales.id}
        AND ${salesPayments.paymentTypeId} = ${filters.paymentTypeId}
      )`,
    );
  }
  return conditions;
};

/**
 * Filtros no nivel da linha de item (para rankings/agregacoes de sales_items).
 * Evita "vazamento" de itens nao filtrados quando o EXISTS so restringe a venda.
 */
export const buildItemLineFilterConditions = (
  filters: AnalyticsFilters,
): SQL[] => {
  const conditions: SQL[] = [];
  if (filters.productsEnterprisesId) {
    conditions.push(
      eq(salesItems.productsEnterprisesId, filters.productsEnterprisesId),
    );
  }
  if (filters.productGroupId) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM products_enterprises pe
        WHERE pe.id = ${salesItems.productsEnterprisesId}
        AND pe.product_group_id = ${filters.productGroupId}
      )`,
    );
  }
  return conditions;
};

/** Filtro no nivel da linha de pagamento. */
export const buildPaymentLineFilterConditions = (
  filters: AnalyticsFilters,
): SQL[] => {
  const conditions: SQL[] = [];
  if (filters.paymentTypeId) {
    conditions.push(eq(salesPayments.paymentTypeId, filters.paymentTypeId));
  }
  return conditions;
};

/**
 * Filtros no nivel da linha de devolucao (via item).
 * seller/member/payment continuam no documento; produto/grupo restringem a linha.
 */
export const buildReturnLineFilterConditions = (
  filters: AnalyticsFilters,
): SQL[] => {
  const conditions: SQL[] = [];
  if (filters.productsEnterprisesId) {
    conditions.push(
      eq(salesItems.productsEnterprisesId, filters.productsEnterprisesId),
    );
  }
  if (filters.productGroupId) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM products_enterprises pe
        WHERE pe.id = ${salesItems.productsEnterprisesId}
        AND pe.product_group_id = ${filters.productGroupId}
      )`,
    );
  }
  return conditions;
};

/** Scope de venda realizada por data de conclusao do documento. */
export const buildRealizedScope = (
  enterpriseId: string,
  period: ResolvedPeriod,
  filters: AnalyticsFilters = {},
) =>
  and(
    eq(sales.enterprisesId, enterpriseId),
    eq(sales.type, "VENDA"),
    eq(sales.status, "FINALIZADA"),
    buildRealizedDateCondition(period),
    ...buildSaleFilterConditions(filters),
  );

/**
 * Scope financeiro realizado: venda finalizada cuja parcela vence no periodo.
 * Exige FROM/JOIN em sales_dues.
 */
export const buildRealizedDueScope = (
  enterpriseId: string,
  period: ResolvedPeriod,
  filters: AnalyticsFilters = {},
) =>
  and(
    eq(sales.enterprisesId, enterpriseId),
    eq(sales.type, "VENDA"),
    eq(sales.status, "FINALIZADA"),
    buildRecognizedDateCondition(period),
    ...buildSaleDocumentFilterConditions(filters),
    ...buildDuePaymentFilterConditions(filters),
  );

/** Scope de venda em pipeline. */
export const buildPipelineScope = (
  enterpriseId: string,
  period: ResolvedPeriod,
  filters: AnalyticsFilters = {},
) =>
  and(
    eq(sales.enterprisesId, enterpriseId),
    eq(sales.status, "ABERTA"),
    buildPipelineDateCondition(period),
    ...buildSaleFilterConditions(filters),
  );

/**
 * Scope de devolucao alinhado ao bruto (mesmos filtros de documento).
 * Com filtro de produto/grupo, inclui devolucoes de vendas que contem o produto
 * (mesmo criterio EXISTS do grossRevenue), nao so a linha do produto.
 */
export const buildReturnsScope = (
  enterpriseId: string,
  period: ResolvedPeriod,
  filters: AnalyticsFilters = {},
) =>
  and(
    eq(sales.enterprisesId, enterpriseId),
    eq(sales.type, "VENDA"),
    buildReturnDateCondition(period),
    ...buildSaleFilterConditions(filters),
  );

/** Valor proporcional da linha de devolucao com base no item da venda. */
export const returnLineValueSql = () =>
  sql`case
    when ${salesItems.quantity} > 0
    then (${salesItems.valueTotal} / ${salesItems.quantity}) * ${salesReturns.quantity}
    else 0
  end`;

/**
 * Receita liquida do item apos devolucoes acumuladas:
 * valueTotal * (quantity - quantityReturned) / quantity.
 */
export const netItemRevenueSql = () =>
  sql`case
    when ${salesItems.quantity} > 0
    then (${salesItems.valueTotal} / ${salesItems.quantity})
      * (${salesItems.quantity} - ${salesItems.quantityReturned})
    else 0
  end`;

/** Quantidade liquida do item. */
export const netItemQuantitySql = () =>
  sql`(${salesItems.quantity} - ${salesItems.quantityReturned})`;

/** Receita liquida do item rateada na parcela do periodo. */
export const recognizedItemRevenueSql = () =>
  sql`(${netItemRevenueSql()}) * ${recognizedFractionSql()}`;

/** Quantidade liquida do item rateada na parcela do periodo. */
export const recognizedItemQuantitySql = () =>
  sql`(${netItemQuantitySql()}) * ${recognizedFractionSql()}`;

/** Extrai os filtros da consulta. */
export const extractFilters = (query: AnalyticsFilters): AnalyticsFilters => ({
  sellerId: query.sellerId,
  memberId: query.memberId,
  paymentTypeId: query.paymentTypeId,
  productsEnterprisesId: query.productsEnterprisesId,
  productGroupId: query.productGroupId,
});
