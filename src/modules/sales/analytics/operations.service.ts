import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { sales, salesItems, salesReturns } from "../../../db/schema.js";
import { decNum, ratePercent, roundMoney } from "./metrics.js";
import {
  fillDenseSeries,
  formatBucketLabel,
  pgGranularitySql,
  resolveAnalyticsPeriod,
} from "./period.js";
import {
  extractFilters,
  localCreatedDateSql,
  localReturnCreatedDateSql,
  returnLineValueSql,
} from "./scope.js";
import type { AnalyticsOperationsQuery } from "./schema.js";

const statusLabels: Record<string, string> = {
  ABERTA: "Aberta",
  PARCIAL: "Parcial",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
  INATIVA: "Inativa",
};

const typeLabels: Record<string, string> = {
  VENDA: "Venda",
  ORCAMENTO: "Orçamento",
  "ORDEM DE SERVICO": "Ordem de serviço",
};

type StatusBreakdownRow = {
  type: string;
  status: string;
  count: string;
  value: string;
};

const mapBreakdownRows = (
  rows: StatusBreakdownRow[],
  totalCount: number,
  totalValue: number,
) =>
  rows.map((row) => {
    const count = Number(row.count);
    const value = roundMoney(decNum(row.value));
    return {
      type: row.type,
      typeLabel: typeLabels[row.type] ?? row.type,
      status: row.status,
      statusLabel: statusLabels[row.status] ?? row.status,
      label: `${typeLabels[row.type] ?? row.type} · ${statusLabels[row.status] ?? row.status}`,
      count,
      value,
      sharePercent: ratePercent(count, totalCount),
      valueSharePercent: ratePercent(value, totalValue),
    };
  });

const buildBreakdownSection = (rows: StatusBreakdownRow[]) => {
  const totalCount = rows.reduce((sum, r) => sum + Number(r.count), 0);
  const totalValue = rows.reduce((sum, r) => sum + decNum(r.value), 0);
  return {
    breakdown: mapBreakdownRows(rows, totalCount, totalValue),
    totalCount,
    totalValue: roundMoney(totalValue),
  };
};

/** Servico de analytics de operacoes de vendas. */
export class OperationsAnalyticsService {
  /**
   * Breakdown operacional separado:
   * - salesByStatus: somente type = VENDA
   * - operationsByStatus: ORCAMENTO + ORDEM DE SERVICO (ainda nao e venda)
   */
  public async statusBreakdown(
    enterpriseId: string,
    query: AnalyticsOperationsQuery,
  ) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const localDate = localCreatedDateSql(period.timezone);
    const operationTypes = ["ORCAMENTO", "ORDEM DE SERVICO"] as const;

    const filterConditions = [];
    if (filters.sellerId) filterConditions.push(eq(sales.sellerId, filters.sellerId));
    if (filters.memberId) {
      filterConditions.push(eq(sales.memberId, filters.memberId));
    }

    const periodConditions = [
      eq(sales.enterprisesId, enterpriseId),
      sql`${localDate} >= ${period.from}::date`,
      sql`${localDate} <= ${period.to}::date`,
      ...filterConditions,
    ];

    const [salesRows, operationsRows] = await Promise.all([
      db
        .select({
          type: sales.type,
          status: sales.status,
          count: sql<string>`count(*)`,
          value: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
        })
        .from(sales)
        .where(and(...periodConditions, eq(sales.type, "VENDA")))
        .groupBy(sales.type, sales.status)
        .orderBy(sales.status),
      db
        .select({
          type: sales.type,
          status: sales.status,
          count: sql<string>`count(*)`,
          value: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
        })
        .from(sales)
        .where(
          and(
            ...periodConditions,
            inArray(sales.type, [...operationTypes]),
          ),
        )
        .groupBy(sales.type, sales.status)
        .orderBy(sales.type, sales.status),
    ]);

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      salesByStatus: buildBreakdownSection(salesRows),
      operationsByStatus: buildBreakdownSection(operationsRows),
    };
  }

  /**
   * Card de devolucoes: linhas de sales_returns no periodo (createdAt local),
   * taxa sobre vendas criadas no mesmo periodo.
   */
  public async returns(
    enterpriseId: string,
    query: AnalyticsOperationsQuery,
  ) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const returnLocalDate = localReturnCreatedDateSql(period.timezone);
    const saleLocalDate = localCreatedDateSql(period.timezone);
    const bucket = sql`date_trunc(${pgGranularitySql("day")}, ${returnLocalDate}::timestamp)`;
    const returnValue = returnLineValueSql();

    const saleFilters = [
      eq(sales.enterprisesId, enterpriseId),
      eq(sales.type, "VENDA"),
    ];
    if (filters.sellerId) saleFilters.push(eq(sales.sellerId, filters.sellerId));
    if (filters.memberId) {
      saleFilters.push(eq(sales.memberId, filters.memberId));
    }

    const returnsWhere = and(
      ...saleFilters,
      sql`${returnLocalDate} >= ${period.from}::date`,
      sql`${returnLocalDate} <= ${period.to}::date`,
    );
    const allSalesWhere = and(
      ...saleFilters,
      sql`${saleLocalDate} >= ${period.from}::date`,
      sql`${saleLocalDate} <= ${period.to}::date`,
    );

    const [totals, allSales, series] = await Promise.all([
      db
        .select({
          count: sql<string>`count(*)`,
          returnedValue: sql<string>`coalesce(sum(${returnValue}), 0)`,
          salesAffected: sql<string>`count(distinct ${salesReturns.salesId})`,
        })
        .from(salesReturns)
        .innerJoin(sales, eq(salesReturns.salesId, sales.id))
        .innerJoin(salesItems, eq(salesReturns.saleItemId, salesItems.id))
        .where(returnsWhere),
      db
        .select({
          count: sql<string>`count(*)`,
        })
        .from(sales)
        .where(allSalesWhere),
      db
        .select({
          bucketStart: sql<string>`to_char(${bucket}, 'YYYY-MM-DD')`,
          count: sql<string>`count(*)`,
          returnedValue: sql<string>`coalesce(sum(${returnValue}), 0)`,
        })
        .from(salesReturns)
        .innerJoin(sales, eq(salesReturns.salesId, sales.id))
        .innerJoin(salesItems, eq(salesReturns.saleItemId, salesItems.id))
        .where(returnsWhere)
        .groupBy(bucket)
        .orderBy(bucket),
    ]);

    const returnCount = Number(totals[0]?.count ?? 0);
    const salesAffected = Number(totals[0]?.salesAffected ?? 0);
    const salesCount = Number(allSales[0]?.count ?? 0);
    const returnedValue = roundMoney(decNum(totals[0]?.returnedValue));

    const sparse = series.map((row) => ({
      bucketStart: row.bucketStart,
      count: Number(row.count),
      returnedValue: roundMoney(decNum(row.returnedValue)),
    }));

    const denseSeries = fillDenseSeries(
      period,
      "day",
      sparse,
      (bucketStart, bucketLabel) => ({
        bucketStart,
        bucketLabel,
        count: 0,
        returnedValue: 0,
      }),
    );

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      returnCount,
      returnedValue,
      salesAffected,
      salesCount,
      returnRatePercent: ratePercent(salesAffected, salesCount),
      series: denseSeries.map((point) => ({
        ...point,
        bucketLabel:
          point.bucketLabel ?? formatBucketLabel(point.bucketStart, "day"),
      })),
    };
  }
}

export const operationsAnalyticsService = new OperationsAnalyticsService();
