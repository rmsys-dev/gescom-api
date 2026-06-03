import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { sales, salesDues } from "../../../db/schema.js";
import { decNum, roundMoney } from "./metrics.js";
import { analyticsLocalTodaySql, timezoneSqlLiteral } from "./period.js";
import type { AnalyticsReceivablesQuery } from "./schema.js";

export class ReceivablesAnalyticsService {
  public async summary(
    enterpriseId: string,
    query: AnalyticsReceivablesQuery,
  ) {
    const timezone = query.timezone ?? "America/Sao_Paulo";
    const today = analyticsLocalTodaySql(timezone);
    const tz = timezoneSqlLiteral(timezone);

    const conditions = [
      eq(sales.enterprisesId, enterpriseId),
      eq(sales.type, "VENDA"),
      eq(sales.status, "FINALIZADA"),
    ];
    if (query.userId) conditions.push(eq(sales.userId, query.userId));
    if (query.memberId) conditions.push(eq(sales.memberId, query.memberId));

    const rows = await db
      .select({
        totalOutstanding: sql<string>`coalesce(sum(${salesDues.valueInstallment}), 0)`,
        dueCount: sql<string>`count(*)`,
        overdueTotal: sql<string>`coalesce(sum(CASE WHEN DATE(timezone(${tz}, ${salesDues.dueDate})) < ${today} THEN ${salesDues.valueInstallment} ELSE 0 END), 0)`,
        overdueCount: sql<string>`count(*) FILTER (WHERE DATE(timezone(${tz}, ${salesDues.dueDate})) < ${today})`,
        upcomingTotal: sql<string>`coalesce(sum(CASE WHEN DATE(timezone(${tz}, ${salesDues.dueDate})) >= ${today} THEN ${salesDues.valueInstallment} ELSE 0 END), 0)`,
        upcomingCount: sql<string>`count(*) FILTER (WHERE DATE(timezone(${tz}, ${salesDues.dueDate})) >= ${today})`,
      })
      .from(salesDues)
      .innerJoin(sales, eq(salesDues.salesId, sales.id))
      .where(and(...conditions));

    const row = rows[0];

    return {
      timezone,
      totalOutstanding: decNum(row?.totalOutstanding),
      dueCount: Number(row?.dueCount ?? 0),
      overdueTotal: decNum(row?.overdueTotal),
      overdueCount: Number(row?.overdueCount ?? 0),
      upcomingTotal: decNum(row?.upcomingTotal),
      upcomingCount: Number(row?.upcomingCount ?? 0),
    };
  }

  public async aging(enterpriseId: string, query: AnalyticsReceivablesQuery) {
    const timezone = query.timezone ?? "America/Sao_Paulo";
    const today = analyticsLocalTodaySql(timezone);
    const tz = timezoneSqlLiteral(timezone);

    const conditions = [
      eq(sales.enterprisesId, enterpriseId),
      eq(sales.type, "VENDA"),
      eq(sales.status, "FINALIZADA"),
    ];
    if (query.userId) conditions.push(eq(sales.userId, query.userId));
    if (query.memberId) conditions.push(eq(sales.memberId, query.memberId));

    const agingBucket = sql<string>`CASE
          WHEN DATE(timezone(${tz}, ${salesDues.dueDate})) >= ${today} THEN 'a_vencer'
          WHEN ${today} - DATE(timezone(${tz}, ${salesDues.dueDate})) <= 30 THEN 'vencido_1_30'
          WHEN ${today} - DATE(timezone(${tz}, ${salesDues.dueDate})) <= 60 THEN 'vencido_31_60'
          ELSE 'vencido_60_plus'
        END`;

    const rows = await db
      .select({
        bucket: agingBucket,
        total: sql<string>`coalesce(sum(${salesDues.valueInstallment}), 0)`,
        count: sql<string>`count(*)`,
      })
      .from(salesDues)
      .innerJoin(sales, eq(salesDues.salesId, sales.id))
      .where(and(...conditions))
      .groupBy(sql`1`);

    const bucketOrder = [
      "a_vencer",
      "vencido_1_30",
      "vencido_31_60",
      "vencido_60_plus",
    ];
    const byBucket = new Map(rows.map((r) => [r.bucket, r]));
    const totalAmount = rows.reduce((sum, r) => sum + decNum(r.total), 0);

    return {
      timezone,
      buckets: bucketOrder.map((key) => {
        const row = byBucket.get(key);
        const total = decNum(row?.total);
        return {
          bucket: key,
          total,
          count: Number(row?.count ?? 0),
          sharePercent:
            totalAmount > 0 ? roundMoney((total / totalAmount) * 100) : 0,
        };
      }),
      totalAmount: roundMoney(totalAmount),
    };
  }
}

export const receivablesAnalyticsService = new ReceivablesAnalyticsService();
