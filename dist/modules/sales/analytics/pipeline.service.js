import { and, eq, isNotNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "../../../db/index.js";
import { sales, saleConversions, } from "../../../db/schema.js";
import { decNum, kpiWithComparison, ratePercent, roundMoney } from "./metrics.js";
import { fillDenseSeries, pgGranularitySql, resolveAnalyticsPeriod, resolveComparisonPeriod, timezoneSqlLiteral, withPreviousSeriesPoints, } from "./period.js";
import { buildPipelineScope, buildPipelineDateCondition, buildSaleFilterConditions, extractFilters, localCreatedDateSql, } from "./scope.js";
import { isEnterpriseParameterEnabledFor } from "../../enterprises/parameters/resolve.js";
const conversionDateCondition = (period) => {
    const tz = timezoneSqlLiteral(period.timezone);
    return and(sql `DATE(timezone(${tz}, ${saleConversions.createdAt})) >= ${period.from}::date`, sql `DATE(timezone(${tz}, ${saleConversions.createdAt})) <= ${period.to}::date`);
};
/** Filtros dimensionais aplicados ao orçamento origem (alias de sales). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const buildBudgetAliasFilterConditions = (budgetSale, filters) => {
    const conditions = [];
    if (filters.sellerId) {
        conditions.push(eq(budgetSale.sellerId, filters.sellerId));
    }
    if (filters.memberId) {
        conditions.push(eq(budgetSale.memberId, filters.memberId));
    }
    if (filters.productsEnterprisesId) {
        conditions.push(sql `EXISTS (
        SELECT 1 FROM sales_items si
        WHERE si.sales_id = ${budgetSale.id}
        AND si.products_enterprises_id = ${filters.productsEnterprisesId}
      )`);
    }
    if (filters.productGroupId) {
        conditions.push(sql `EXISTS (
        SELECT 1 FROM sales_items si
        INNER JOIN products_enterprises pe ON pe.id = si.products_enterprises_id
        WHERE si.sales_id = ${budgetSale.id}
        AND pe.product_group_id = ${filters.productGroupId}
      )`);
    }
    if (filters.paymentTypeId) {
        conditions.push(sql `EXISTS (
        SELECT 1 FROM sales_payments sp
        WHERE sp.sales_id = ${budgetSale.id}
        AND sp.payment_type_id = ${filters.paymentTypeId}
      )`);
    }
    return conditions;
};
const fetchPipelineKpis = async (enterpriseId, period, filters, options) => {
    const includeWorkOrders = options?.includeWorkOrders !== false;
    const scope = buildPipelineScope(enterpriseId, period, filters);
    const budgetSale = alias(sales, "budget_for_conversion");
    const [openSales, openBudgets, openWorkOrders, budgetsTotal, conversions] = await Promise.all([
        db
            .select({
            count: sql `count(*)`,
            value: sql `coalesce(sum(${sales.valueLiquid}), 0)`,
        })
            .from(sales)
            .where(and(scope, eq(sales.type, "VENDA"))),
        db
            .select({
            count: sql `count(*)`,
            value: sql `coalesce(sum(${sales.valueLiquid}), 0)`,
        })
            .from(sales)
            .where(and(scope, eq(sales.type, "ORCAMENTO"))),
        includeWorkOrders
            ? db
                .select({
                count: sql `count(*)`,
                value: sql `coalesce(sum(${sales.valueLiquid}), 0)`,
            })
                .from(sales)
                .where(and(scope, eq(sales.type, "ORDEM DE SERVICO")))
            : Promise.resolve([{ count: "0", value: "0" }]),
        db
            .select({
            count: sql `count(*)`,
        })
            .from(sales)
            .where(and(eq(sales.enterprisesId, enterpriseId), eq(sales.type, "ORCAMENTO"), buildPipelineDateCondition(period), ...buildSaleFilterConditions(filters))),
        db
            .select({
            count: sql `count(*)`,
        })
            .from(saleConversions)
            .innerJoin(budgetSale, eq(saleConversions.budgetSaleId, budgetSale.id))
            .where(and(eq(saleConversions.enterprisesId, enterpriseId), conversionDateCondition(period), eq(budgetSale.enterprisesId, enterpriseId), ...buildBudgetAliasFilterConditions(budgetSale, filters))),
    ]);
    const openBudgetsCount = Number(openBudgets[0]?.count ?? 0);
    const conversionCount = Number(conversions[0]?.count ?? 0);
    const budgetsTotalCount = Number(budgetsTotal[0]?.count ?? 0);
    return {
        openSalesCount: Number(openSales[0]?.count ?? 0),
        openSalesValue: roundMoney(decNum(openSales[0]?.value)),
        openBudgetsCount,
        openBudgetsValue: roundMoney(decNum(openBudgets[0]?.value)),
        openWorkOrdersCount: includeWorkOrders
            ? Number(openWorkOrders[0]?.count ?? 0)
            : 0,
        openWorkOrdersValue: includeWorkOrders
            ? roundMoney(decNum(openWorkOrders[0]?.value))
            : 0,
        budgetsTotalCount,
        conversionCountInPeriod: conversionCount,
        conversionRatePercent: budgetsTotalCount > 0
            ? roundMoney((conversionCount / budgetsTotalCount) * 100)
            : 0,
        openPipelineValue: roundMoney(decNum(openSales[0]?.value) + decNum(openBudgets[0]?.value)),
    };
};
const emptyPipelinePoint = (bucketStart, bucketLabel) => ({
    bucketStart,
    bucketLabel,
    openSalesValue: 0,
    openBudgetsValue: 0,
    openSalesCount: 0,
    openBudgetsCount: 0,
    openPipelineValue: 0,
});
const fetchPipelineSeries = async (enterpriseId, period, filters, granularity) => {
    const scope = buildPipelineScope(enterpriseId, period, filters);
    const pgGran = pgGranularitySql(granularity);
    const localDate = localCreatedDateSql(period.timezone);
    const bucket = sql `date_trunc(${pgGran}, ${localDate}::timestamp)`;
    const rows = await db
        .select({
        bucketStart: sql `to_char(${bucket}, 'YYYY-MM-DD')`,
        openSalesValue: sql `coalesce(sum(CASE WHEN ${sales.type} = 'VENDA' THEN ${sales.valueLiquid} ELSE 0 END), 0)`,
        openBudgetsValue: sql `coalesce(sum(CASE WHEN ${sales.type} = 'ORCAMENTO' THEN ${sales.valueLiquid} ELSE 0 END), 0)`,
        openSalesCount: sql `count(*) FILTER (WHERE ${sales.type} = 'VENDA')`,
        openBudgetsCount: sql `count(*) FILTER (WHERE ${sales.type} = 'ORCAMENTO')`,
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
    async overview(enterpriseId, query) {
        const period = resolveAnalyticsPeriod(query);
        const filters = extractFilters(query);
        const includeWorkOrders = await isEnterpriseParameterEnabledFor(enterpriseId, "trabalha_os");
        const kpis = await fetchPipelineKpis(enterpriseId, period, filters, {
            includeWorkOrders,
        });
        return {
            period: {
                from: period.from,
                to: period.to,
                timezone: period.timezone,
            },
            kpis,
        };
    }
    async compare(enterpriseId, query) {
        const period = resolveAnalyticsPeriod(query);
        const filters = extractFilters(query);
        const compareMode = query.compareMode === "none" ? "previous_period" : query.compareMode;
        const comparisonPeriod = resolveComparisonPeriod(period, compareMode);
        if (!comparisonPeriod) {
            throw new Error("Periodo de comparacao invalido");
        }
        const includeWorkOrders = await isEnterpriseParameterEnabledFor(enterpriseId, "trabalha_os");
        const [current, comparison] = await Promise.all([
            fetchPipelineKpis(enterpriseId, period, filters, { includeWorkOrders }),
            fetchPipelineKpis(enterpriseId, comparisonPeriod, filters, {
                includeWorkOrders,
            }),
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
                openSalesCount: kpiWithComparison(current.openSalesCount, comparison.openSalesCount),
                openSalesValue: kpiWithComparison(current.openSalesValue, comparison.openSalesValue),
                openBudgetsCount: kpiWithComparison(current.openBudgetsCount, comparison.openBudgetsCount),
                openBudgetsValue: kpiWithComparison(current.openBudgetsValue, comparison.openBudgetsValue),
                openWorkOrdersCount: kpiWithComparison(current.openWorkOrdersCount, comparison.openWorkOrdersCount),
                openWorkOrdersValue: kpiWithComparison(current.openWorkOrdersValue, comparison.openWorkOrdersValue),
                openPipelineValue: kpiWithComparison(current.openPipelineValue, comparison.openPipelineValue),
                conversionCountInPeriod: kpiWithComparison(current.conversionCountInPeriod, comparison.conversionCountInPeriod),
                conversionRatePercent: kpiWithComparison(current.conversionRatePercent, comparison.conversionRatePercent),
            },
        };
    }
    async timeseries(enterpriseId, query) {
        const period = resolveAnalyticsPeriod(query);
        const filters = extractFilters(query);
        const granularity = query.granularity ?? "day";
        const series = await fetchPipelineSeries(enterpriseId, period, filters, granularity);
        const comparisonPeriod = resolveComparisonPeriod(period, query.compareMode ?? "none");
        const comparisonSeries = comparisonPeriod
            ? await fetchPipelineSeries(enterpriseId, comparisonPeriod, filters, granularity)
            : undefined;
        return {
            period: { from: period.from, to: period.to, timezone: period.timezone },
            granularity,
            series: withPreviousSeriesPoints(series, comparisonSeries),
            ...(comparisonSeries ? { comparisonSeries } : {}),
        };
    }
    async budgets(enterpriseId, query) {
        const period = resolveAnalyticsPeriod(query);
        const tz = timezoneSqlLiteral(period.timezone);
        const budgetSales = alias(sales, "budget");
        const budgetScope = and(eq(sales.enterprisesId, enterpriseId), eq(sales.type, "ORCAMENTO"), sql `DATE(timezone(${tz}, ${sales.createdAt})) >= ${period.from}::date`, sql `DATE(timezone(${tz}, ${sales.createdAt})) <= ${period.to}::date`);
        const conversionDateFilter = and(eq(saleConversions.enterprisesId, enterpriseId), conversionDateCondition(period));
        const [totals, convertedValue, avgConversionDays] = await Promise.all([
            db
                .select({
                count: sql `count(*)`,
                totalValue: sql `coalesce(sum(${sales.valueLiquid}), 0)`,
                openValue: sql `coalesce(sum(CASE WHEN ${sales.status} = 'ABERTA' THEN ${sales.valueLiquid} ELSE 0 END), 0)`,
            })
                .from(sales)
                .where(budgetScope),
            db
                .select({
                convertedValue: sql `coalesce(sum(${sales.valueLiquid}), 0)`,
                convertedCount: sql `count(*)`,
            })
                .from(saleConversions)
                .innerJoin(sales, eq(saleConversions.generatedSaleId, sales.id))
                .where(and(conversionDateFilter, isNotNull(saleConversions.budgetSaleId))),
            db
                .select({
                avgDays: sql `coalesce(avg(
            EXTRACT(EPOCH FROM (${sales.createdAt} - ${budgetSales.createdAt})) / 86400
          ), 0)`,
            })
                .from(saleConversions)
                .innerJoin(sales, eq(saleConversions.generatedSaleId, sales.id))
                .innerJoin(budgetSales, eq(saleConversions.budgetSaleId, budgetSales.id))
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
    async budgetsFunnel(enterpriseId, query) {
        const period = resolveAnalyticsPeriod(query);
        const tz = timezoneSqlLiteral(period.timezone);
        const statusLabels = {
            ABERTA: "Aberta",
            PARCIAL: "Parcial",
            FINALIZADA: "Finalizada",
            CANCELADA: "Cancelada",
            INATIVA: "Inativa",
        };
        const rows = await db
            .select({
            status: sales.status,
            count: sql `count(*)`,
            value: sql `coalesce(sum(${sales.valueLiquid}), 0)`,
        })
            .from(sales)
            .where(and(eq(sales.enterprisesId, enterpriseId), eq(sales.type, "ORCAMENTO"), sql `DATE(timezone(${tz}, ${sales.createdAt})) >= ${period.from}::date`, sql `DATE(timezone(${tz}, ${sales.createdAt})) <= ${period.to}::date`))
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
