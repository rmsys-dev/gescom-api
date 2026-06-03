import { eq, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { sales, salesItems, salesReturns } from "../../../db/schema.js";
import { decNum, kpiWithComparison, roundMoney } from "./metrics.js";
import {
  pgGranularitySql,
  resolveAnalyticsPeriod,
  resolveComparisonPeriod,
  type ResolvedPeriod,
} from "./period.js";
import {
  buildRealizedScope,
  buildReturnsScope,
  effectiveCompletionDateSql,
  extractFilters,
  localReturnCreatedDateSql,
  type AnalyticsFilters,
} from "./scope.js";
import type {
  AnalyticsPeriodQuery,
  AnalyticsTimeseriesQuery,
  CompareMode,
} from "./schema.js";

export type RealizedKpis = {
  grossRevenue: number;
  netRevenue: number;
  salesCount: number;
  averageTicket: number;
  itemsSold: number;
  discountTotal: number;
  returnsTotal: number;
  returnCount: number;
  pieRevenue: number;
  serviceRevenue: number;
};

const fetchRealizedKpis = async (
  enterpriseId: string,
  period: ResolvedPeriod,
  filters: AnalyticsFilters,
): Promise<RealizedKpis> => {
  const scope = buildRealizedScope(enterpriseId, period, filters);

  const [salesAgg, itemsAgg, returnsAgg] = await Promise.all([
    db
      .select({
        grossRevenue: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
        salesCount: sql<string>`count(*)`,
        pieRevenue: sql<string>`coalesce(sum(${sales.valuePie}), 0)`,
        serviceRevenue: sql<string>`coalesce(sum(${sales.valueService}), 0)`,
        discountTotal: sql<string>`coalesce(sum(coalesce(${sales.discountValuetems}, 0) + coalesce(${sales.valueDiscountFinancial}, 0)), 0)`,
      })
      .from(sales)
      .where(scope),
    db
      .select({
        itemsSold: sql<string>`coalesce(sum(${salesItems.quantity} - ${salesItems.quantityReturned}), 0)`,
      })
      .from(salesItems)
      .innerJoin(sales, eq(salesItems.salesId, sales.id))
      .where(scope),
    db
      .select({
        returnsTotal: sql<string>`coalesce(sum(${salesReturns.valueTotal}), 0)`,
        returnCount: sql<string>`count(*)`,
      })
      .from(salesReturns)
      .where(buildReturnsScope(enterpriseId, period)),
  ]);

  const grossRevenue = decNum(salesAgg[0]?.grossRevenue);
  const returnsTotal = decNum(returnsAgg[0]?.returnsTotal);
  const salesCount = Number(salesAgg[0]?.salesCount ?? 0);

  return {
    grossRevenue: roundMoney(grossRevenue),
    netRevenue: roundMoney(grossRevenue - returnsTotal),
    salesCount,
    averageTicket:
      salesCount > 0 ? roundMoney(grossRevenue / salesCount) : 0,
    itemsSold: decNum(itemsAgg[0]?.itemsSold),
    discountTotal: decNum(salesAgg[0]?.discountTotal),
    returnsTotal: roundMoney(returnsTotal),
    returnCount: Number(returnsAgg[0]?.returnCount ?? 0),
    pieRevenue: decNum(salesAgg[0]?.pieRevenue),
    serviceRevenue: decNum(salesAgg[0]?.serviceRevenue),
  };
};

const buildOverviewKpis = (
  current: RealizedKpis,
  previous?: RealizedKpis,
) => ({
  grossRevenue: kpiWithComparison(
    current.grossRevenue,
    previous?.grossRevenue,
  ),
  netRevenue: kpiWithComparison(current.netRevenue, previous?.netRevenue),
  salesCount: kpiWithComparison(current.salesCount, previous?.salesCount),
  averageTicket: kpiWithComparison(
    current.averageTicket,
    previous?.averageTicket,
  ),
  itemsSold: kpiWithComparison(current.itemsSold, previous?.itemsSold),
  discountTotal: kpiWithComparison(
    current.discountTotal,
    previous?.discountTotal,
  ),
  returnsTotal: {
    ...kpiWithComparison(current.returnsTotal, previous?.returnsTotal),
    returnCount: current.returnCount,
  },
  pieRevenue: { value: current.pieRevenue },
  serviceRevenue: { value: current.serviceRevenue },
});

type RealizedSeriesPoint = {
  bucketStart: string;
  bucketLabel: string;
  grossRevenue: number;
  netRevenue: number;
  salesCount: number;
  returnsTotal: number;
};

const fetchRealizedSeries = async (
  enterpriseId: string,
  period: ResolvedPeriod,
  filters: AnalyticsFilters,
  granularity: string,
): Promise<RealizedSeriesPoint[]> => {
  const scope = buildRealizedScope(enterpriseId, period, filters);
  const pgGran = pgGranularitySql(granularity);
  const effective = effectiveCompletionDateSql(period.timezone);
  const bucket = sql`date_trunc(${pgGran}, ${effective}::timestamp)`;

  const rows = await db
    .select({
      bucketStart: sql<string>`to_char(${bucket}, 'YYYY-MM-DD')`,
      bucketLabel: sql<string>`to_char(${bucket}, 'YYYY-MM')`,
      grossRevenue: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
      salesCount: sql<string>`count(*)`,
    })
    .from(sales)
    .where(scope)
    .groupBy(bucket)
    .orderBy(bucket);

  const returnsScope = buildReturnsScope(enterpriseId, period);
  const returnBucket = sql`date_trunc(${pgGran}, ${localReturnCreatedDateSql(period.timezone)}::timestamp)`;

  const returnRows = await db
    .select({
      bucketStart: sql<string>`to_char(${returnBucket}, 'YYYY-MM-DD')`,
      returnsTotal: sql<string>`coalesce(sum(${salesReturns.valueTotal}), 0)`,
    })
    .from(salesReturns)
    .where(returnsScope)
    .groupBy(returnBucket);

  const returnsByBucket = new Map(
    returnRows.map((r) => [r.bucketStart, decNum(r.returnsTotal)]),
  );

  return rows.map((row) => {
    const grossRevenue = decNum(row.grossRevenue);
    const returnsTotal = returnsByBucket.get(row.bucketStart) ?? 0;
    return {
      bucketStart: row.bucketStart,
      bucketLabel: row.bucketLabel,
      grossRevenue: roundMoney(grossRevenue),
      netRevenue: roundMoney(grossRevenue - returnsTotal),
      salesCount: Number(row.salesCount),
      returnsTotal: roundMoney(returnsTotal),
    };
  });
};

export class RealizedAnalyticsService {
  public async overview(enterpriseId: string, query: AnalyticsPeriodQuery) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const comparisonPeriod = resolveComparisonPeriod(
      period,
      query.compareMode ?? "none",
    );

    const [current, previous] = await Promise.all([
      fetchRealizedKpis(enterpriseId, period, filters),
      comparisonPeriod
        ? fetchRealizedKpis(enterpriseId, comparisonPeriod, filters)
        : Promise.resolve(undefined),
    ]);

    return {
      period: {
        from: period.from,
        to: period.to,
        timezone: period.timezone,
      },
      ...(comparisonPeriod
        ? {
            comparison: {
              from: comparisonPeriod.from,
              to: comparisonPeriod.to,
              mode: query.compareMode,
            },
          }
        : {}),
      kpis: buildOverviewKpis(current, previous),
    };
  }

  public async compare(enterpriseId: string, query: AnalyticsPeriodQuery) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const compareMode: CompareMode =
      query.compareMode === "none" ? "previous_period" : query.compareMode;
    const comparisonPeriod = resolveComparisonPeriod(period, compareMode);

    if (!comparisonPeriod) {
      throw new Error("Periodo de comparacao invalido");
    }

    const [current, comparison] = await Promise.all([
      fetchRealizedKpis(enterpriseId, period, filters),
      fetchRealizedKpis(enterpriseId, comparisonPeriod, filters),
    ]);

    const deltas = {
      grossRevenue: kpiWithComparison(
        current.grossRevenue,
        comparison.grossRevenue,
      ).changePercent,
      netRevenue: kpiWithComparison(
        current.netRevenue,
        comparison.netRevenue,
      ).changePercent,
      salesCount: kpiWithComparison(current.salesCount, comparison.salesCount)
        .changePercent,
      averageTicket: kpiWithComparison(
        current.averageTicket,
        comparison.averageTicket,
      ).changePercent,
      itemsSold: kpiWithComparison(current.itemsSold, comparison.itemsSold)
        .changePercent,
    };

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      comparisonPeriod: {
        from: comparisonPeriod.from,
        to: comparisonPeriod.to,
        mode: compareMode,
      },
      current,
      comparison,
      deltas,
    };
  }

  public async timeseries(
    enterpriseId: string,
    query: AnalyticsTimeseriesQuery,
  ) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const granularity = query.granularity ?? "day";

    const series = await fetchRealizedSeries(
      enterpriseId,
      period,
      filters,
      granularity,
    );

    const comparisonPeriod = resolveComparisonPeriod(
      period,
      query.compareMode ?? "none",
    );

    const comparisonSeries = comparisonPeriod
      ? await fetchRealizedSeries(
          enterpriseId,
          comparisonPeriod,
          filters,
          granularity,
        )
      : undefined;

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      granularity,
      series,
      ...(comparisonSeries ? { comparisonSeries } : {}),
    };
  }
}

export const realizedAnalyticsService = new RealizedAnalyticsService();
