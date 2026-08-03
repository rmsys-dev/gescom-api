import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { sales } from "../../../db/schema.js";
import { decNum, ratePercent, roundMoney } from "./metrics.js";
import {
  fillDenseSeries,
  formatBucketLabel,
  pgGranularitySql,
  resolveAnalyticsPeriod,
} from "./period.js";
import { extractFilters, localCreatedDateSql } from "./scope.js";
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

/** Servico de analytics de operacoes de vendas. */
export class OperationsAnalyticsService {
  /** Obtem o breakdow de status das vendas. */
  public async statusBreakdown(
    enterpriseId: string,
    query: AnalyticsOperationsQuery,
  ) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const localDate = localCreatedDateSql(period.timezone);

    const filterConditions = [];
    if (filters.sellerId) filterConditions.push(eq(sales.sellerId, filters.sellerId));
    if (filters.memberId) {
      filterConditions.push(eq(sales.memberId, filters.memberId));
    }

    const rows = await db
      .select({
        type: sales.type,
        status: sales.status,
        count: sql<string>`count(*)`,
        value: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
      })
      .from(sales)
      .where(
        and(
          eq(sales.enterprisesId, enterpriseId),
          sql`${localDate} >= ${period.from}::date`,
          sql`${localDate} <= ${period.to}::date`,
          ...filterConditions,
        ),
      )
      .groupBy(sales.type, sales.status)
      .orderBy(sales.type, sales.status);

    const totalCount = rows.reduce((sum, r) => sum + Number(r.count), 0);
    const totalValue = rows.reduce((sum, r) => sum + decNum(r.value), 0);

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      breakdown: rows.map((row) => {
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
      }),
      totalCount,
      totalValue: roundMoney(totalValue),
    };
  }

  /** Obtem o breakdown de cancelamentos das vendas. */
  public async cancellations(
    enterpriseId: string,
    query: AnalyticsOperationsQuery,
  ) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const localDate = localCreatedDateSql(period.timezone);
    const bucket = sql`date_trunc(${pgGranularitySql("day")}, ${localDate}::timestamp)`;

    const baseFilters = [
      eq(sales.enterprisesId, enterpriseId),
      eq(sales.type, "VENDA"),
      sql`${localDate} >= ${period.from}::date`,
      sql`${localDate} <= ${period.to}::date`,
    ];
    if (filters.sellerId) baseFilters.push(eq(sales.sellerId, filters.sellerId));
    if (filters.memberId) {
      baseFilters.push(eq(sales.memberId, filters.memberId));
    }

    const cancelledWhere = and(
      ...baseFilters,
      eq(sales.status, "CANCELADA"),
    );
    const allSalesWhere = and(...baseFilters);

    const [totals, allSales, series] = await Promise.all([
      db
        .select({
          count: sql<string>`count(*)`,
          lostValue: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
        })
        .from(sales)
        .where(cancelledWhere),
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
          lostValue: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
        })
        .from(sales)
        .where(cancelledWhere)
        .groupBy(bucket)
        .orderBy(bucket),
    ]);

    const cancellationCount = Number(totals[0]?.count ?? 0);
    const salesCount = Number(allSales[0]?.count ?? 0);
    const lostValue = roundMoney(decNum(totals[0]?.lostValue));

    const sparse = series.map((row) => ({
      bucketStart: row.bucketStart,
      count: Number(row.count),
      lostValue: roundMoney(decNum(row.lostValue)),
    }));

    const denseSeries = fillDenseSeries(
      period,
      "day",
      sparse,
      (bucketStart, bucketLabel) => ({
        bucketStart,
        bucketLabel,
        count: 0,
        lostValue: 0,
      }),
    );

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      cancellationCount,
      lostValue,
      salesCount,
      cancellationRatePercent: ratePercent(cancellationCount, salesCount),
      series: denseSeries.map((point) => ({
        ...point,
        bucketLabel:
          point.bucketLabel ?? formatBucketLabel(point.bucketStart, "day"),
      })),
    };
  }
}

export const operationsAnalyticsService = new OperationsAnalyticsService();
