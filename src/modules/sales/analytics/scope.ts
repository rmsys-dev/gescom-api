import { and, eq, gte, lte, sql, type SQL } from "drizzle-orm";
import {
  sales,
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

export const localReturnCreatedDateSql = (timezone: string) =>
  sql`DATE(timezone(${timezoneSqlLiteral(timezone)}, ${salesReturns.createdAt}))`;

export const buildRealizedDateCondition = (
  period: ResolvedPeriod,
): SQL | undefined => {
  const effective = effectiveCompletionDateSql(period.timezone);
  return and(
    gte(effective, sql`${period.from}::date`),
    lte(effective, sql`${period.to}::date`),
  );
};

export const buildPipelineDateCondition = (
  period: ResolvedPeriod,
): SQL | undefined => {
  const localDate = localCreatedDateSql(period.timezone);
  return and(
    gte(localDate, sql`${period.from}::date`),
    lte(localDate, sql`${period.to}::date`),
  );
};

export const buildReturnDateCondition = (
  period: ResolvedPeriod,
): SQL | undefined => {
  const localDate = localReturnCreatedDateSql(period.timezone);
  return and(
    gte(localDate, sql`${period.from}::date`),
    lte(localDate, sql`${period.to}::date`),
  );
};

export const buildSaleFilterConditions = (filters: AnalyticsFilters): SQL[] => {
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

export const buildReturnsScope = (
  enterpriseId: string,
  period: ResolvedPeriod,
) =>
  and(
    eq(salesReturns.enterprisesId, enterpriseId),
    eq(salesReturns.status, "FINALIZADA"),
    buildReturnDateCondition(period),
  );

export const extractFilters = (query: AnalyticsFilters): AnalyticsFilters => ({
  sellerId: query.sellerId,
  memberId: query.memberId,
  paymentTypeId: query.paymentTypeId,
  productsEnterprisesId: query.productsEnterprisesId,
  productGroupId: query.productGroupId,
});
