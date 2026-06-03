import { and, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../../db/index.js";
import {
  sales,
  salesBudgetConversions,
} from "../../../db/schema.js";
import { decNum, kpiWithComparison, roundMoney } from "./metrics.js";
import {
  pgGranularitySql,
  resolveAnalyticsPeriod,
  resolveComparisonPeriod,
  type ResolvedPeriod,
} from "./period.js";
import {
  buildPipelineScope,
  extractFilters,
  localCreatedDateSql,
  type AnalyticsFilters,
} from "./scope.js";
import type {
  AnalyticsPeriodQuery,
  AnalyticsTimeseriesQuery,
  CompareMode,
} from "./schema.js";

export type PipelineKpis = {
  openSalesCount: number;
  openSalesValue: number;
  openBudgetsCount: number;
  openBudgetsValue: number;
  budgetsPartialCount: number;
  budgetsClosedCount: number;
  conversionCountInPeriod: number;
  conversionRatePercent: number;
};

const fetchPipelineKpis = async (
  enterpriseId: string,
  period: ResolvedPeriod,
  filters: AnalyticsFilters,
): Promise<PipelineKpis> => {
  const scope = buildPipelineScope(enterpriseId, period, filters);

  const [openSales, openBudgets, budgetStatus, conversions] = await Promise.all([
    db
      .select({
        count: sql<string>`count(*)`,
        value: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
      })
      .from(sales)
      .where(and(scope, eq(sales.type, "VENDA"))),
    db
      .select({
        count: sql<string>`count(*)`,
        value: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
      })
      .from(sales)
      .where(and(scope, eq(sales.type, "ORCAMENTO"))),
    db
      .select({
        situation: sales.budgetClosureSituation,
        count: sql<string>`count(*)`,
      })
      .from(sales)
      .where(and(scope, eq(sales.type, "ORCAMENTO")))
      .groupBy(sales.budgetClosureSituation),
    db
      .select({
        count: sql<string>`count(*)`,
      })
      .from(salesBudgetConversions)
      .where(
        and(
          eq(salesBudgetConversions.enterprisesId, enterpriseId),
          sql`DATE(timezone(${period.timezone}, ${salesBudgetConversions.createdAt})) >= ${period.from}::date`,
          sql`DATE(timezone(${period.timezone}, ${salesBudgetConversions.createdAt})) <= ${period.to}::date`,
        ),
      ),
  ]);

  const partialCount =
    budgetStatus.find((r) => r.situation === "PARCIAL")?.count ?? "0";
  const closedCount =
    budgetStatus.find((r) => r.situation === "FECHADO")?.count ?? "0";
  const openBudgetsCount = Number(openBudgets[0]?.count ?? 0);
  const conversionCount = Number(conversions[0]?.count ?? 0);
  const totalBudgetsInPeriod = openBudgetsCount + Number(closedCount);

  return {
    openSalesCount: Number(openSales[0]?.count ?? 0),
    openSalesValue: decNum(openSales[0]?.value),
    openBudgetsCount,
    openBudgetsValue: decNum(openBudgets[0]?.value),
    budgetsPartialCount: Number(partialCount),
    budgetsClosedCount: Number(closedCount),
    conversionCountInPeriod: conversionCount,
    conversionRatePercent:
      totalBudgetsInPeriod > 0
        ? roundMoney((conversionCount / totalBudgetsInPeriod) * 100)
        : 0,
  };
};

type PipelineSeriesPoint = {
  bucketStart: string;
  bucketLabel: string;
  openSalesValue: number;
  openBudgetsValue: number;
  openSalesCount: number;
  openBudgetsCount: number;
};

const fetchPipelineSeries = async (
  enterpriseId: string,
  period: ResolvedPeriod,
  filters: AnalyticsFilters,
  granularity: string,
): Promise<PipelineSeriesPoint[]> => {
  const scope = buildPipelineScope(enterpriseId, period, filters);
  const pgGran = pgGranularitySql(granularity);
  const localDate = localCreatedDateSql(period.timezone);
  const bucket = sql`date_trunc(${pgGran}, ${localDate}::timestamp)`;

  const rows = await db
    .select({
      bucketStart: sql<string>`to_char(${bucket}, 'YYYY-MM-DD')`,
      bucketLabel: sql<string>`to_char(${bucket}, 'YYYY-MM')`,
      openSalesValue: sql<string>`coalesce(sum(CASE WHEN ${sales.type} = 'VENDA' THEN ${sales.valueLiquid} ELSE 0 END), 0)`,
      openBudgetsValue: sql<string>`coalesce(sum(CASE WHEN ${sales.type} = 'ORCAMENTO' THEN ${sales.valueLiquid} ELSE 0 END), 0)`,
      openSalesCount: sql<string>`count(*) FILTER (WHERE ${sales.type} = 'VENDA')`,
      openBudgetsCount: sql<string>`count(*) FILTER (WHERE ${sales.type} = 'ORCAMENTO')`,
    })
    .from(sales)
    .where(scope)
    .groupBy(bucket)
    .orderBy(bucket);

  return rows.map((row) => ({
    bucketStart: row.bucketStart,
    bucketLabel: row.bucketLabel,
    openSalesValue: decNum(row.openSalesValue),
    openBudgetsValue: decNum(row.openBudgetsValue),
    openSalesCount: Number(row.openSalesCount),
    openBudgetsCount: Number(row.openBudgetsCount),
  }));
};

export class PipelineAnalyticsService {
  public async overview(enterpriseId: string, query: AnalyticsPeriodQuery) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const kpis = await fetchPipelineKpis(enterpriseId, period, filters);

    return {
      period: {
        from: period.from,
        to: period.to,
        timezone: period.timezone,
      },
      kpis,
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
      fetchPipelineKpis(enterpriseId, period, filters),
      fetchPipelineKpis(enterpriseId, comparisonPeriod, filters),
    ]);

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      comparisonPeriod: {
        from: comparisonPeriod.from,
        to: comparisonPeriod.to,
        mode: compareMode,
      },
      current,
      comparison,
      deltas: {
        openSalesCount: kpiWithComparison(
          current.openSalesCount,
          comparison.openSalesCount,
        ).changePercent,
        openSalesValue: kpiWithComparison(
          current.openSalesValue,
          comparison.openSalesValue,
        ).changePercent,
        conversionCountInPeriod: kpiWithComparison(
          current.conversionCountInPeriod,
          comparison.conversionCountInPeriod,
        ).changePercent,
      },
    };
  }

  public async timeseries(
    enterpriseId: string,
    query: AnalyticsTimeseriesQuery,
  ) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const granularity = query.granularity ?? "day";

    const series = await fetchPipelineSeries(
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
      ? await fetchPipelineSeries(
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

  public async budgets(enterpriseId: string, query: AnalyticsPeriodQuery) {
    const period = resolveAnalyticsPeriod(query);
    const budgetSales = alias(sales, "budget");

    const budgetScope = and(
      eq(sales.enterprisesId, enterpriseId),
      eq(sales.type, "ORCAMENTO"),
      sql`DATE(timezone(${period.timezone}, ${sales.createdAt})) >= ${period.from}::date`,
      sql`DATE(timezone(${period.timezone}, ${sales.createdAt})) <= ${period.to}::date`,
    );

    const conversionDateFilter = and(
      eq(salesBudgetConversions.enterprisesId, enterpriseId),
      sql`DATE(timezone(${period.timezone}, ${salesBudgetConversions.createdAt})) >= ${period.from}::date`,
      sql`DATE(timezone(${period.timezone}, ${salesBudgetConversions.createdAt})) <= ${period.to}::date`,
    );

    const [totals, convertedValue, avgConversionDays] = await Promise.all([
      db
        .select({
          count: sql<string>`count(*)`,
          totalValue: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
          openValue: sql<string>`coalesce(sum(CASE WHEN ${sales.status} = 'ABERTA' THEN ${sales.valueLiquid} ELSE 0 END), 0)`,
        })
        .from(sales)
        .where(budgetScope),
      db
        .select({
          convertedValue: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
          convertedCount: sql<string>`count(*)`,
        })
        .from(salesBudgetConversions)
        .innerJoin(sales, eq(salesBudgetConversions.generatedSaleId, sales.id))
        .where(conversionDateFilter),
      db
        .select({
          avgDays: sql<string>`coalesce(avg(
            EXTRACT(EPOCH FROM (${sales.createdAt} - ${budgetSales.createdAt})) / 86400
          ), 0)`,
        })
        .from(salesBudgetConversions)
        .innerJoin(sales, eq(salesBudgetConversions.generatedSaleId, sales.id))
        .innerJoin(
          budgetSales,
          eq(salesBudgetConversions.budgetSaleId, budgetSales.id),
        )
        .where(conversionDateFilter),
    ]);

    const budgetCount = Number(totals[0]?.count ?? 0);
    const conversionCount = Number(convertedValue[0]?.convertedCount ?? 0);

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      budgetsCount: budgetCount,
      budgetsTotalValue: decNum(totals[0]?.totalValue),
      openBudgetsValue: decNum(totals[0]?.openValue),
      convertedValue: decNum(convertedValue[0]?.convertedValue),
      conversionCount,
      conversionRatePercent:
        budgetCount > 0
          ? roundMoney((conversionCount / budgetCount) * 100)
          : 0,
      avgConversionDays: roundMoney(decNum(avgConversionDays[0]?.avgDays)),
    };
  }

  public async budgetsFunnel(
    enterpriseId: string,
    query: AnalyticsPeriodQuery,
  ) {
    const period = resolveAnalyticsPeriod(query);

    const rows = await db
      .select({
        situation: sales.budgetClosureSituation,
        count: sql<string>`count(*)`,
        value: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.enterprisesId, enterpriseId),
          eq(sales.type, "ORCAMENTO"),
          eq(sales.status, "ABERTA"),
          sql`DATE(timezone(${period.timezone}, ${sales.createdAt})) >= ${period.from}::date`,
          sql`DATE(timezone(${period.timezone}, ${sales.createdAt})) <= ${period.to}::date`,
        ),
      )
      .groupBy(sales.budgetClosureSituation);

    const totalCount = rows.reduce((sum, r) => sum + Number(r.count), 0);
    const totalValue = rows.reduce((sum, r) => sum + decNum(r.value), 0);

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      funnel: rows.map((row) => ({
        situation: row.situation,
        count: Number(row.count),
        value: decNum(row.value),
        sharePercent:
          totalCount > 0
            ? roundMoney((Number(row.count) / totalCount) * 100)
            : 0,
      })),
      totalCount,
      totalValue: roundMoney(totalValue),
    };
  }
}

export const pipelineAnalyticsService = new PipelineAnalyticsService();
