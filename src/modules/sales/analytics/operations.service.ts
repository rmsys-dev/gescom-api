import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { sales } from "../../../db/schema.js";
import { decNum, roundMoney } from "./metrics.js";
import {
  pgGranularitySql,
  resolveAnalyticsPeriod,
} from "./period.js";
import { extractFilters, localCreatedDateSql } from "./scope.js";
import type { AnalyticsOperationsQuery } from "./schema.js";

export class OperationsAnalyticsService {
  public async statusBreakdown(
    enterpriseId: string,
    query: AnalyticsOperationsQuery,
  ) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const localDate = localCreatedDateSql(period.timezone);

    const filterConditions = [];
    if (filters.userId) filterConditions.push(eq(sales.userId, filters.userId));
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

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      breakdown: rows.map((row) => ({
        type: row.type,
        status: row.status,
        count: Number(row.count),
        value: decNum(row.value),
      })),
    };
  }

  public async cancellations(
    enterpriseId: string,
    query: AnalyticsOperationsQuery,
  ) {
    const period = resolveAnalyticsPeriod(query);
    const filters = extractFilters(query);
    const localDate = localCreatedDateSql(period.timezone);
    const bucket = sql`date_trunc(${pgGranularitySql("day")}, ${localDate}::timestamp)`;

    const filterConditions = [
      eq(sales.enterprisesId, enterpriseId),
      eq(sales.type, "VENDA"),
      eq(sales.status, "CANCELADA"),
      sql`${localDate} >= ${period.from}::date`,
      sql`${localDate} <= ${period.to}::date`,
    ];
    if (filters.userId) filterConditions.push(eq(sales.userId, filters.userId));
    if (filters.memberId) {
      filterConditions.push(eq(sales.memberId, filters.memberId));
    }

    const where = and(...filterConditions);

    const [totals, series] = await Promise.all([
      db
        .select({
          count: sql<string>`count(*)`,
          lostValue: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
        })
        .from(sales)
        .where(where),
      db
        .select({
          bucketStart: sql<string>`to_char(${bucket}, 'YYYY-MM-DD')`,
          count: sql<string>`count(*)`,
          lostValue: sql<string>`coalesce(sum(${sales.valueLiquid}), 0)`,
        })
        .from(sales)
        .where(where)
        .groupBy(bucket)
        .orderBy(bucket),
    ]);

    return {
      period: { from: period.from, to: period.to, timezone: period.timezone },
      cancellationCount: Number(totals[0]?.count ?? 0),
      lostValue: decNum(totals[0]?.lostValue),
      series: series.map((row) => ({
        bucketStart: row.bucketStart,
        count: Number(row.count),
        lostValue: decNum(row.lostValue),
      })),
    };
  }
}

export const operationsAnalyticsService = new OperationsAnalyticsService();
