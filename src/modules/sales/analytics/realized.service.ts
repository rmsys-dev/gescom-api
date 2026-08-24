import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  productTypes,
  sales,
  salesDues,
  salesItems,
  salesReturns,
} from "../../../db/schema.js";
import { PRODUCT_TYPE_SERVICE_CODE } from "../../../shared/products/product-type-service.js";
import {
  decNum,
  kpiWithComparison,
  ratePercent,
  roundMoney,
} from "./metrics.js";
import {
  fillDenseSeries,
  pgGranularitySql,
  resolveAnalyticsPeriod,
  resolveComparisonPeriod,
  withPreviousSeriesPoints,
  type ResolvedPeriod,
} from "./period.js";
import {
  buildRealizedDueScope,
  buildReturnsScope,
  effectiveRecognizedDateSql,
  extractFilters,
  localReturnCreatedDateSql,
  recognizedAmountSql,
  recognizedCostSql,
  recognizedDiscountSql,
  recognizedFractionSql,
  recognizedProductRevenueSql,
  recognizedServiceRevenueSql,
  returnLineValueSql,
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
  returnRatePercent: number;
  productRevenue: number;
  serviceRevenue: number;
  productSharePercent: number;
  serviceSharePercent: number;
  costTotal: number;
  grossProfit: number;
  netProfit: number;
  grossMarginPercent: number;
};

const fetchRealizedKpis = async (
  enterpriseId: string,
  period: ResolvedPeriod,
  filters: AnalyticsFilters,
): Promise<RealizedKpis> => {
  const scope = buildRealizedDueScope(enterpriseId, period, filters);
  const amount = recognizedAmountSql();
  const fraction = recognizedFractionSql();

  const [salesAgg, itemsAgg, returnsAgg] = await Promise.all([
    db
      .select({
        liquidRevenue: sql<string>`coalesce(sum(${amount}), 0)`,
        salesCount: sql<string>`count(distinct ${sales.id})`,
        productRevenue: sql<string>`coalesce(sum(${recognizedProductRevenueSql()}), 0)`,
        serviceRevenue: sql<string>`coalesce(sum(${recognizedServiceRevenueSql()}), 0)`,
        discountTotal: sql<string>`coalesce(sum(${recognizedDiscountSql()}), 0)`,
        costTotal: sql<string>`coalesce(sum(${recognizedCostSql()}), 0)`,
      })
      .from(salesDues)
      .innerJoin(sales, eq(salesDues.salesId, sales.id))
      .where(scope),
    db
      .select({
        itemsSold: sql<string>`coalesce(sum(greatest(${salesItems.quantity} - coalesce(${salesItems.quantityReturned}, 0), 0) * ${fraction}), 0)`,
      })
      .from(salesDues)
      .innerJoin(sales, eq(salesDues.salesId, sales.id))
      .innerJoin(salesItems, eq(salesItems.salesId, sales.id))
      .innerJoin(productTypes, eq(salesItems.productTypeId, productTypes.id))
      .where(
        and(scope, ne(productTypes.type, PRODUCT_TYPE_SERVICE_CODE)),
      ),
    db
      .select({
        returnsTotal: sql<string>`coalesce(sum(${returnLineValueSql()}), 0)`,
        returnCount: sql<string>`count(*)`,
      })
      .from(salesReturns)
      .innerJoin(sales, eq(salesReturns.salesId, sales.id))
      .innerJoin(salesItems, eq(salesReturns.saleItemId, salesItems.id))
      .where(buildReturnsScope(enterpriseId, period, filters)),
  ]);

  // Parcelas = valueLiquid (já pós-desconto). Faturamento reconstrói o bruto.
  const liquidRevenue = decNum(salesAgg[0]?.liquidRevenue);
  const discountTotal = roundMoney(decNum(salesAgg[0]?.discountTotal));
  const returnsTotal = decNum(returnsAgg[0]?.returnsTotal);
  const salesCount = Number(salesAgg[0]?.salesCount ?? 0);
  const productRevenue = roundMoney(decNum(salesAgg[0]?.productRevenue));
  const serviceRevenue = roundMoney(decNum(salesAgg[0]?.serviceRevenue));
  const productServiceBase = productRevenue + serviceRevenue;
  const costTotal = roundMoney(decNum(salesAgg[0]?.costTotal));
  const grossRevenue = roundMoney(liquidRevenue + discountTotal);
  const netRevenue = roundMoney(liquidRevenue - returnsTotal);
  const grossProfit = roundMoney(liquidRevenue - costTotal);
  const netProfit = roundMoney(netRevenue - costTotal);

  return {
    grossRevenue,
    netRevenue,
    salesCount,
    averageTicket:
      salesCount > 0 ? roundMoney(liquidRevenue / salesCount) : 0,
    itemsSold: decNum(itemsAgg[0]?.itemsSold),
    discountTotal,
    returnsTotal: roundMoney(returnsTotal),
    returnCount: Number(returnsAgg[0]?.returnCount ?? 0),
    returnRatePercent: ratePercent(returnsTotal, liquidRevenue),
    productRevenue,
    serviceRevenue,
    productSharePercent: ratePercent(productRevenue, productServiceBase),
    serviceSharePercent: ratePercent(serviceRevenue, productServiceBase),
    costTotal,
    grossProfit,
    netProfit,
    grossMarginPercent: ratePercent(grossProfit, liquidRevenue),
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
    returnRatePercent: current.returnRatePercent,
  },
  productRevenue: {
    ...kpiWithComparison(current.productRevenue, previous?.productRevenue),
    sharePercent: current.productSharePercent,
  },
  serviceRevenue: {
    ...kpiWithComparison(current.serviceRevenue, previous?.serviceRevenue),
    sharePercent: current.serviceSharePercent,
  },
  costTotal: kpiWithComparison(current.costTotal, previous?.costTotal),
  grossProfit: {
    ...kpiWithComparison(current.grossProfit, previous?.grossProfit),
    marginPercent: current.grossMarginPercent,
  },
  netProfit: kpiWithComparison(current.netProfit, previous?.netProfit),
});

type RealizedSeriesPoint = {
  bucketStart: string;
  bucketLabel: string;
  grossRevenue: number;
  netRevenue: number;
  salesCount: number;
  returnsTotal: number;
  costTotal: number;
  grossProfit: number;
  netProfit: number;
};

const emptyRealizedPoint = (
  bucketStart: string,
  bucketLabel: string,
): RealizedSeriesPoint => ({
  bucketStart,
  bucketLabel,
  grossRevenue: 0,
  netRevenue: 0,
  salesCount: 0,
  returnsTotal: 0,
  costTotal: 0,
  grossProfit: 0,
  netProfit: 0,
});

const fetchRealizedSeriesSparse = async (
  enterpriseId: string,
  period: ResolvedPeriod,
  filters: AnalyticsFilters,
  granularity: string,
): Promise<Array<Omit<RealizedSeriesPoint, "bucketLabel"> & { bucketLabel?: string }>> => {
  const scope = buildRealizedDueScope(enterpriseId, period, filters);
  const pgGran = pgGranularitySql(granularity);
  const recognized = effectiveRecognizedDateSql(period.timezone);
  const bucket = sql`date_trunc(${pgGran}, ${recognized}::timestamp)`;
  const amount = recognizedAmountSql();

  const rows = await db
    .select({
      bucketStart: sql<string>`to_char(${bucket}, 'YYYY-MM-DD')`,
      liquidRevenue: sql<string>`coalesce(sum(${amount}), 0)`,
      discountTotal: sql<string>`coalesce(sum(${recognizedDiscountSql()}), 0)`,
      salesCount: sql<string>`count(distinct ${sales.id})`,
      costTotal: sql<string>`coalesce(sum(${recognizedCostSql()}), 0)`,
    })
    .from(salesDues)
    .innerJoin(sales, eq(salesDues.salesId, sales.id))
    .where(scope)
    .groupBy(bucket)
    .orderBy(bucket);

  const returnsScope = buildReturnsScope(enterpriseId, period, filters);
  const returnBucket = sql`date_trunc(${pgGran}, ${localReturnCreatedDateSql(period.timezone)}::timestamp)`;

  const returnRows = await db
    .select({
      bucketStart: sql<string>`to_char(${returnBucket}, 'YYYY-MM-DD')`,
      returnsTotal: sql<string>`coalesce(sum(${returnLineValueSql()}), 0)`,
    })
    .from(salesReturns)
    .innerJoin(sales, eq(salesReturns.salesId, sales.id))
    .innerJoin(salesItems, eq(salesReturns.saleItemId, salesItems.id))
    .where(returnsScope)
    .groupBy(returnBucket);

  const salesByBucket = new Map(
    rows.map((r) => [
      r.bucketStart,
      {
        liquidRevenue: decNum(r.liquidRevenue),
        discountTotal: decNum(r.discountTotal),
        salesCount: Number(r.salesCount),
        costTotal: decNum(r.costTotal),
      },
    ]),
  );
  const returnsByBucket = new Map(
    returnRows.map((r) => [r.bucketStart, decNum(r.returnsTotal)]),
  );

  const bucketStarts = new Set([
    ...salesByBucket.keys(),
    ...returnsByBucket.keys(),
  ]);

  return [...bucketStarts].map((bucketStart) => {
    const sale = salesByBucket.get(bucketStart);
    const liquidRevenue = sale?.liquidRevenue ?? 0;
    const discountTotal = sale?.discountTotal ?? 0;
    const returnsTotal = returnsByBucket.get(bucketStart) ?? 0;
    const costTotal = sale?.costTotal ?? 0;
    const grossRevenue = liquidRevenue + discountTotal;
    const netRevenue = liquidRevenue - returnsTotal;
    return {
      bucketStart,
      grossRevenue: roundMoney(grossRevenue),
      netRevenue: roundMoney(netRevenue),
      salesCount: sale?.salesCount ?? 0,
      returnsTotal: roundMoney(returnsTotal),
      costTotal: roundMoney(costTotal),
      grossProfit: roundMoney(liquidRevenue - costTotal),
      netProfit: roundMoney(netRevenue - costTotal),
    };
  });
};

const fetchRealizedSeries = async (
  enterpriseId: string,
  period: ResolvedPeriod,
  filters: AnalyticsFilters,
  granularity: string,
): Promise<RealizedSeriesPoint[]> => {
  const sparse = await fetchRealizedSeriesSparse(
    enterpriseId,
    period,
    filters,
    granularity,
  );
  return fillDenseSeries(period, granularity, sparse, emptyRealizedPoint);
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
      ),
      netRevenue: kpiWithComparison(current.netRevenue, comparison.netRevenue),
      salesCount: kpiWithComparison(current.salesCount, comparison.salesCount),
      averageTicket: kpiWithComparison(
        current.averageTicket,
        comparison.averageTicket,
      ),
      itemsSold: kpiWithComparison(current.itemsSold, comparison.itemsSold),
      discountTotal: kpiWithComparison(
        current.discountTotal,
        comparison.discountTotal,
      ),
      returnsTotal: kpiWithComparison(
        current.returnsTotal,
        comparison.returnsTotal,
      ),
      returnRatePercent: kpiWithComparison(
        current.returnRatePercent,
        comparison.returnRatePercent,
      ),
      productRevenue: kpiWithComparison(current.productRevenue, comparison.productRevenue),
      serviceRevenue: kpiWithComparison(
        current.serviceRevenue,
        comparison.serviceRevenue,
      ),
      costTotal: kpiWithComparison(current.costTotal, comparison.costTotal),
      grossProfit: kpiWithComparison(current.grossProfit, comparison.grossProfit),
      netProfit: kpiWithComparison(current.netProfit, comparison.netProfit),
      grossMarginPercent: kpiWithComparison(
        current.grossMarginPercent,
        comparison.grossMarginPercent,
      ),
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

    const seriesWithPrevious = withPreviousSeriesPoints(
      series,
      comparisonSeries,
    );

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      granularity,
      series: seriesWithPrevious,
      ...(comparisonSeries ? { comparisonSeries } : {}),
    };
  }
}

export const realizedAnalyticsService = new RealizedAnalyticsService();
