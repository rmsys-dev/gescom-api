import { and, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../../db/index.js";
import {
  enterprisesMembers,
  paymentTypes,
  productBrands,
  productGroups,
  productsEnterprises,
  sales,
  salesItems,
  salesPayments,
  salesReturnItems,
  salesReturns,
  users,
} from "../../../db/schema.js";
import { decNum, roundMoney, sharePercent } from "./metrics.js";
import { resolveAnalyticsPeriod } from "./period.js";
import {
  buildRealizedScope,
  buildReturnsScope,
  extractFilters,
} from "./scope.js";
import type {
  AnalyticsRankingQuery,
  AnalyticsTopProductsQuery,
} from "./schema.js";

export class DimensionsAnalyticsService {
  public async byPaymentType(
    enterpriseId: string,
    query: AnalyticsRankingQuery,
  ) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const scope = buildRealizedScope(enterpriseId, period, filters);

    const rows = await db
      .select({
        id: paymentTypes.id,
        label: paymentTypes.description,
        revenue: sql<string>`coalesce(sum(${salesPayments.valueTotal}), 0)`,
        salesCount: sql<string>`count(distinct ${sales.id})`,
      })
      .from(salesPayments)
      .innerJoin(sales, eq(salesPayments.salesId, sales.id))
      .innerJoin(paymentTypes, eq(salesPayments.paymentTypeId, paymentTypes.id))
      .where(scope)
      .groupBy(paymentTypes.id, paymentTypes.description)
      .orderBy(sql`sum(${salesPayments.valueTotal}) desc`)
      .limit(query.limit ?? 10);

    const totalRevenue = rows.reduce((sum, r) => sum + decNum(r.revenue), 0);

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      items: rows.map((row) => ({
        id: row.id,
        label: row.label,
        revenue: decNum(row.revenue),
        salesCount: Number(row.salesCount),
        sharePercent: sharePercent(decNum(row.revenue), totalRevenue),
      })),
      totalRevenue: roundMoney(totalRevenue),
    };
  }

  public async bySeller(enterpriseId: string, query: AnalyticsRankingQuery) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const scope = buildRealizedScope(enterpriseId, period, filters);

    const rows = await db
      .select({
        id: sales.sellerId,
        label: sales.sellerLegalName,
        revenue: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
        salesCount: sql<string>`count(*)`,
      })
      .from(sales)
      .where(scope)
      .groupBy(sales.sellerId, sales.sellerLegalName)
      .orderBy(sql`sum(${sales.valueLiquid}) desc`)
      .limit(query.limit ?? 10);

    const totalRevenue = rows.reduce((sum, r) => sum + decNum(r.revenue), 0);

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      items: rows.map((row) => ({
        id: row.id,
        label: row.label,
        revenue: decNum(row.revenue),
        salesCount: Number(row.salesCount),
        sharePercent: sharePercent(decNum(row.revenue), totalRevenue),
      })),
      totalRevenue: roundMoney(totalRevenue),
    };
  }

  public async byCustomer(
    enterpriseId: string,
    query: AnalyticsRankingQuery,
  ) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const scope = and(
      buildRealizedScope(enterpriseId, period, filters),
      sql`${sales.memberId} is not null`,
    );

    const rows = await db
      .select({
        id: sales.memberId,
        label: users.userName,
        revenue: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
        salesCount: sql<string>`count(*)`,
      })
      .from(sales)
      .leftJoin(
        enterprisesMembers,
        eq(sales.memberId, enterprisesMembers.id),
      )
      .leftJoin(users, eq(enterprisesMembers.userId, users.id))
      .where(scope)
      .groupBy(sales.memberId, users.userName)
      .orderBy(sql`sum(${sales.valueLiquid}) desc`)
      .limit(query.limit ?? 10);

    const totalRevenue = rows.reduce((sum, r) => sum + decNum(r.revenue), 0);

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      items: rows.map((row) => ({
        id: row.id,
        label: row.label ?? "Cliente sem nome",
        revenue: decNum(row.revenue),
        salesCount: Number(row.salesCount),
        sharePercent: sharePercent(decNum(row.revenue), totalRevenue),
      })),
      totalRevenue: roundMoney(totalRevenue),
    };
  }

  public async topProducts(
    enterpriseId: string,
    query: AnalyticsTopProductsQuery,
  ) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const scope = buildRealizedScope(enterpriseId, period, filters);
    const sortBy = query.sortBy ?? "revenue";

    const rows = await db
      .select({
        id: productsEnterprises.id,
        code: productsEnterprises.code,
        label: productsEnterprises.description,
        revenue: sql<string>`coalesce(sum(${salesItems.valueTotal}), 0)`,
        quantity: sql<string>`coalesce(sum(${salesItems.quantity} - ${salesItems.quantityReturned}), 0)`,
        salesCount: sql<string>`count(distinct ${sales.id})`,
      })
      .from(salesItems)
      .innerJoin(sales, eq(salesItems.salesId, sales.id))
      .innerJoin(
        productsEnterprises,
        eq(salesItems.productsEnterprisesId, productsEnterprises.id),
      )
      .where(scope)
      .groupBy(
        productsEnterprises.id,
        productsEnterprises.code,
        productsEnterprises.description,
      )
      .orderBy(
        sortBy === "quantity"
          ? sql`sum(${salesItems.quantity} - ${salesItems.quantityReturned}) desc`
          : sql`sum(${salesItems.valueTotal}) desc`,
      )
      .limit(query.limit ?? 10);

    const totalRevenue = rows.reduce((sum, r) => sum + decNum(r.revenue), 0);

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      sortBy,
      items: rows.map((row) => ({
        id: row.id,
        code: row.code,
        label: row.label,
        revenue: decNum(row.revenue),
        quantity: decNum(row.quantity),
        salesCount: Number(row.salesCount),
        sharePercent: sharePercent(decNum(row.revenue), totalRevenue),
      })),
      totalRevenue: roundMoney(totalRevenue),
    };
  }

  public async byProductGroup(
    enterpriseId: string,
    query: AnalyticsRankingQuery,
  ) {
    return this.byProductDimension(enterpriseId, query, "group");
  }

  public async byProductBrand(
    enterpriseId: string,
    query: AnalyticsRankingQuery,
  ) {
    return this.byProductDimension(enterpriseId, query, "brand");
  }

  private async byProductDimension(
    enterpriseId: string,
    query: AnalyticsRankingQuery,
    dimension: "group" | "brand",
  ) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const scope = buildRealizedScope(enterpriseId, period, filters);

    const dimTable = dimension === "group" ? productGroups : productBrands;
    const dimIdCol =
      dimension === "group"
        ? productsEnterprises.productGroupId
        : productsEnterprises.productBrandId;

    const rows = await db
      .select({
        id: dimTable.id,
        label: dimTable.description,
        revenue: sql<string>`coalesce(sum(${salesItems.valueTotal}), 0)`,
        quantity: sql<string>`coalesce(sum(${salesItems.quantity} - ${salesItems.quantityReturned}), 0)`,
        salesCount: sql<string>`count(distinct ${sales.id})`,
      })
      .from(salesItems)
      .innerJoin(sales, eq(salesItems.salesId, sales.id))
      .innerJoin(
        productsEnterprises,
        eq(salesItems.productsEnterprisesId, productsEnterprises.id),
      )
      .innerJoin(dimTable, eq(dimIdCol, dimTable.id))
      .where(scope)
      .groupBy(dimTable.id, dimTable.description)
      .orderBy(sql`sum(${salesItems.valueTotal}) desc`)
      .limit(query.limit ?? 10);

    const totalRevenue = rows.reduce((sum, r) => sum + decNum(r.revenue), 0);

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      items: rows.map((row) => ({
        id: row.id,
        label: row.label,
        revenue: decNum(row.revenue),
        quantity: decNum(row.quantity),
        salesCount: Number(row.salesCount),
        sharePercent: sharePercent(decNum(row.revenue), totalRevenue),
      })),
      totalRevenue: roundMoney(totalRevenue),
    };
  }

  public async returnsSummary(
    enterpriseId: string,
    query: AnalyticsRankingQuery,
  ) {
    const period = resolveAnalyticsPeriod(query);
    const returnsScope = buildReturnsScope(enterpriseId, period);
    const realizedScope = buildRealizedScope(
      enterpriseId,
      period,
      extractFilters(query),
    );

    const [returnsAgg, grossAgg, topProducts] = await Promise.all([
      db
        .select({
          returnsTotal: sql<string>`coalesce(sum(${salesReturns.valueTotal}), 0)`,
          returnCount: sql<string>`count(*)`,
        })
        .from(salesReturns)
        .where(returnsScope),
      db
        .select({
          grossRevenue: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
        })
        .from(sales)
        .where(realizedScope),
      db
        .select({
          id: productsEnterprises.id,
          label: productsEnterprises.description,
          quantity: sql<string>`coalesce(sum(${salesReturnItems.quantity}), 0)`,
          revenue: sql<string>`coalesce(sum(${salesReturnItems.valueTotal}), 0)`,
        })
        .from(salesReturnItems)
        .innerJoin(
          salesReturns,
          eq(salesReturnItems.salesReturnId, salesReturns.id),
        )
        .innerJoin(
          salesItems,
          eq(salesReturnItems.saleItemId, salesItems.id),
        )
        .innerJoin(
          productsEnterprises,
          eq(salesItems.productsEnterprisesId, productsEnterprises.id),
        )
        .where(returnsScope)
        .groupBy(productsEnterprises.id, productsEnterprises.description)
        .orderBy(sql`sum(${salesReturnItems.valueTotal}) desc`)
        .limit(query.limit ?? 10),
    ]);

    const returnsTotal = decNum(returnsAgg[0]?.returnsTotal);
    const grossRevenue = decNum(grossAgg[0]?.grossRevenue);

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      returnsTotal: roundMoney(returnsTotal),
      returnCount: Number(returnsAgg[0]?.returnCount ?? 0),
      returnRatePercent:
        grossRevenue > 0
          ? roundMoney((returnsTotal / grossRevenue) * 100)
          : 0,
      topReturnedProducts: topProducts.map((row) => ({
        id: row.id,
        label: row.label,
        quantity: decNum(row.quantity),
        revenue: decNum(row.revenue),
      })),
    };
  }
}

export const dimensionsAnalyticsService = new DimensionsAnalyticsService();
