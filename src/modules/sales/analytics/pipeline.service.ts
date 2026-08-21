import { and, eq, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../../db/index.js";
import {
  sales,
  salesBudgetConversions,
} from "../../../db/schema.js";
import { decNum, kpiWithComparison, ratePercent, roundMoney } from "./metrics.js";
import {
  fillDenseSeries,
  pgGranularitySql,
  resolveAnalyticsPeriod,
  resolveComparisonPeriod,
  timezoneSqlLiteral,
  withPreviousSeriesPoints,
  type ResolvedPeriod,
} from "./period.js";
import {
  buildPipelineScope,
  buildPipelineDateCondition,
  buildSaleFilterConditions,
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
  /** Ordens de servico com status ABERTA no periodo (scope de pipeline). */
  openWorkOrdersCount: number;
  openWorkOrdersValue: number;
  budgetsTotalCount: number;
  conversionCountInPeriod: number;
  conversionRatePercent: number;
  /** Soma openSalesValue + openBudgetsValue (card unico de pipeline aberto). */
  openPipelineValue: number;
};

const conversionDateCondition = (period: ResolvedPeriod) => {
  const tz = timezoneSqlLiteral(period.timezone);
  return and(
    sql`DATE(timezone(${tz}, ${salesBudgetConversions.createdAt})) >= ${period.from}::date`,
    sql`DATE(timezone(${tz}, ${salesBudgetConversions.createdAt})) <= ${period.to}::date`,
  );
};

/** Filtros dimensionais aplicados ao orçamento origem (alias de sales). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildBudgetAliasFilterConditions = (
  budgetSale: any,
  filters: AnalyticsFilters,
) => {
  const conditions = [];
  if (filters.sellerId) {
    conditions.push(eq(budgetSale.sellerId, filters.sellerId));
  }
  if (filters.memberId) {
    conditions.push(eq(budgetSale.memberId, filters.memberId));
  }
  if (filters.productsEnterprisesId) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM sales_items si
        WHERE si.sales_id = ${budgetSale.id}
        AND si.products_enterprises_id = ${filters.productsEnterprisesId}
      )`,
    );
  }
  if (filters.productGroupId) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM sales_items si
        INNER JOIN products_enterprises pe ON pe.id = si.products_enterprises_id
        WHERE si.sales_id = ${budgetSale.id}
        AND pe.product_group_id = ${filters.productGroupId}
      )`,
    );
  }
  if (filters.paymentTypeId) {
    conditions.push(
      sql`EXISTS (
        SELECT 1 FROM sales_payments sp
        WHERE sp.sales_id = ${budgetSale.id}
        AND sp.payment_type_id = ${filters.paymentTypeId}
      )`,
    );
  }
  return conditions;
};

const fetchPipelineKpis = async (
  enterpriseId: string,
  period: ResolvedPeriod,
  filters: AnalyticsFilters,
): Promise<PipelineKpis> => {
  const scope = buildPipelineScope(enterpriseId, period, filters);
  const budgetSale = alias(sales, "budget_for_conversion");

  const [openSales, openBudgets, openWorkOrders, budgetsTotal, conversions] =
    await Promise.all([
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
          count: sql<string>`count(*)`,
          value: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
        })
        .from(sales)
        .where(and(scope, eq(sales.type, "ORDEM DE SERVICO"))),
      db
        .select({
          count: sql<string>`count(*)`,
        })
        .from(sales)
        .where(
          and(
            eq(sales.enterprisesId, enterpriseId),
            eq(sales.type, "ORCAMENTO"),
            buildPipelineDateCondition(period),
            ...buildSaleFilterConditions(filters),
          ),
        ),
      db
        .select({
          count: sql<string>`count(*)`,
        })
        .from(salesBudgetConversions)
        .innerJoin(
          budgetSale,
          eq(salesBudgetConversions.budgetSaleId, budgetSale.id),
        )
        .where(
          and(
            eq(salesBudgetConversions.enterprisesId, enterpriseId),
            conversionDateCondition(period),
            eq(budgetSale.enterprisesId, enterpriseId),
            ...buildBudgetAliasFilterConditions(budgetSale, filters),
          ),
        ),
    ]);

  const openBudgetsCount = Number(openBudgets[0]?.count ?? 0);
  const conversionCount = Number(conversions[0]?.count ?? 0);
  const budgetsTotalCount = Number(budgetsTotal[0]?.count ?? 0);

  return {
    openSalesCount: Number(openSales[0]?.count ?? 0),
    openSalesValue: roundMoney(decNum(openSales[0]?.value)),
    openBudgetsCount,
    openBudgetsValue: roundMoney(decNum(openBudgets[0]?.value)),
    openWorkOrdersCount: Number(openWorkOrders[0]?.count ?? 0),
    openWorkOrdersValue: roundMoney(decNum(openWorkOrders[0]?.value)),
    budgetsTotalCount,
    conversionCountInPeriod: conversionCount,
    conversionRatePercent:
      budgetsTotalCount > 0
        ? roundMoney((conversionCount / budgetsTotalCount) * 100)
        : 0,
    openPipelineValue: roundMoney(
      decNum(openSales[0]?.value) + decNum(openBudgets[0]?.value),
    ),
  };
};

const emptyPipelinePoint = (
  bucketStart: string,
  bucketLabel: string,
): PipelineSeriesPoint => ({
  bucketStart,
  bucketLabel,
  openSalesValue: 0,
  openBudgetsValue: 0,
  openSalesCount: 0,
  openBudgetsCount: 0,
  openPipelineValue: 0,
});

type PipelineSeriesPoint = {
  bucketStart: string;
  bucketLabel: string;
  openSalesValue: number;
  openBudgetsValue: number;
  openSalesCount: number;
  openBudgetsCount: number;
  openPipelineValue: number;
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
      openSalesValue: sql<string>`coalesce(sum(CASE WHEN ${sales.type} = 'VENDA' THEN ${sales.valueLiquid} ELSE 0 END), 0)`,
      openBudgetsValue: sql<string>`coalesce(sum(CASE WHEN ${sales.type} = 'ORCAMENTO' THEN ${sales.valueLiquid} ELSE 0 END), 0)`,
      openSalesCount: sql<string>`count(*) FILTER (WHERE ${sales.type} = 'VENDA')`,
      openBudgetsCount: sql<string>`count(*) FILTER (WHERE ${sales.type} = 'ORCAMENTO')`,
    })
    .from(sales)
    .where(scope)
    .groupBy(bucket)
    .orderBy(bucket);

  const sparse = rows.map((row) => {
    const openSalesValue = roundMoney(decNum(row.openSalesValue));
    const openBudgetsValue = roundMoney(decNum(row.openBudgetsValue));
    return {
      bucketStart: row.bucketStart,
      openSalesValue,
      openBudgetsValue,
      openSalesCount: Number(row.openSalesCount),
      openBudgetsCount: Number(row.openBudgetsCount),
      openPipelineValue: roundMoney(openSalesValue + openBudgetsValue),
    };
  });

  return fillDenseSeries(period, granularity, sparse, emptyPipelinePoint);
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
        ),
        openSalesValue: kpiWithComparison(
          current.openSalesValue,
          comparison.openSalesValue,
        ),
        openBudgetsCount: kpiWithComparison(
          current.openBudgetsCount,
          comparison.openBudgetsCount,
        ),
        openBudgetsValue: kpiWithComparison(
          current.openBudgetsValue,
          comparison.openBudgetsValue,
        ),
        openWorkOrdersCount: kpiWithComparison(
          current.openWorkOrdersCount,
          comparison.openWorkOrdersCount,
        ),
        openWorkOrdersValue: kpiWithComparison(
          current.openWorkOrdersValue,
          comparison.openWorkOrdersValue,
        ),
        openPipelineValue: kpiWithComparison(
          current.openPipelineValue,
          comparison.openPipelineValue,
        ),
        conversionCountInPeriod: kpiWithComparison(
          current.conversionCountInPeriod,
          comparison.conversionCountInPeriod,
        ),
        conversionRatePercent: kpiWithComparison(
          current.conversionRatePercent,
          comparison.conversionRatePercent,
        ),
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
      series: withPreviousSeriesPoints(series, comparisonSeries),
      ...(comparisonSeries ? { comparisonSeries } : {}),
    };
  }

  public async budgets(enterpriseId: string, query: AnalyticsPeriodQuery) {
    const period = resolveAnalyticsPeriod(query);
    const tz = timezoneSqlLiteral(period.timezone);
    const budgetSales = alias(sales, "budget");

    const budgetScope = and(
      eq(sales.enterprisesId, enterpriseId),
      eq(sales.type, "ORCAMENTO"),
      sql`DATE(timezone(${tz}, ${sales.createdAt})) >= ${period.from}::date`,
      sql`DATE(timezone(${tz}, ${sales.createdAt})) <= ${period.to}::date`,
    );

    const conversionDateFilter = and(
      eq(salesBudgetConversions.enterprisesId, enterpriseId),
      conversionDateCondition(period),
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
    const budgetsTotalValue = roundMoney(decNum(totals[0]?.totalValue));
    const openBudgetsValue = roundMoney(decNum(totals[0]?.openValue));
    const convertedVal = roundMoney(decNum(convertedValue[0]?.convertedValue));

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      budgetsCount: budgetCount,
      budgetsTotalValue,
      openBudgetsValue,
      openBudgetsSharePercent: ratePercent(openBudgetsValue, budgetsTotalValue),
      convertedValue: convertedVal,
      conversionCount,
      conversionRatePercent: ratePercent(conversionCount, budgetCount),
      avgConversionDays: roundMoney(decNum(avgConversionDays[0]?.avgDays)),
    };
  }

  public async budgetsFunnel(
    enterpriseId: string,
    query: AnalyticsPeriodQuery,
  ) {
    const period = resolveAnalyticsPeriod(query);
    const tz = timezoneSqlLiteral(period.timezone);

    const statusLabels: Record<string, string> = {
      ABERTA: "Aberta",
      PARCIAL: "Parcial",
      FINALIZADA: "Finalizada",
      CANCELADA: "Cancelada",
      INATIVA: "Inativa",
    };

    const rows = await db
      .select({
        status: sales.status,
        count: sql<string>`count(*)`,
        value: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.enterprisesId, enterpriseId),
          eq(sales.type, "ORCAMENTO"),
          sql`DATE(timezone(${tz}, ${sales.createdAt})) >= ${period.from}::date`,
          sql`DATE(timezone(${tz}, ${sales.createdAt})) <= ${period.to}::date`,
        ),
      )
      .groupBy(sales.status);

    const totalCount = rows.reduce((sum, r) => sum + Number(r.count), 0);
    const totalValue = rows.reduce((sum, r) => sum + decNum(r.value), 0);

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      funnel: rows.map((row) => {
        const count = Number(row.count);
        const value = roundMoney(decNum(row.value));
        return {
          status: row.status,
          label: statusLabels[row.status] ?? row.status,
          count,
          value,
          sharePercent: ratePercent(count, totalCount),
          valueSharePercent: ratePercent(value, totalValue),
        };
      }),
      totalCount,
      totalValue: roundMoney(totalValue),
    };
  }
}

export const pipelineAnalyticsService = new PipelineAnalyticsService();
