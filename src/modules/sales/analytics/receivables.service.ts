import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { sales, salesDues } from "../../../db/schema.js";
import { decNum, ratePercent, roundMoney } from "./metrics.js";
import { analyticsLocalTodaySql } from "./period.js";
import { dueDateUtcSql } from "./scope.js";
import type { AnalyticsReceivablesQuery } from "./schema.js";

const agingBucketLabels: Record<string, string> = {
  a_vencer: "A vencer",
  vencido_1_30: "Vencido 1–30 dias",
  vencido_31_60: "Vencido 31–60 dias",
  vencido_60_plus: "Vencido +60 dias",
};

export class ReceivablesAnalyticsService {
  public async summary(
    enterpriseId: string,
    query: AnalyticsReceivablesQuery,
  ) {
    const timezone = query.timezone ?? "America/Sao_Paulo";
    const today = analyticsLocalTodaySql(timezone);
    const dueDate = dueDateUtcSql();

    const conditions = [
      eq(sales.enterprisesId, enterpriseId),
      eq(sales.type, "VENDA"),
      eq(sales.status, "FINALIZADA"),
    ];
    if (query.sellerId) conditions.push(eq(sales.sellerId, query.sellerId));
    if (query.memberId) conditions.push(eq(sales.memberId, query.memberId));

    const rows = await db
      .select({
        totalOutstanding: sql<string>`coalesce(sum(${salesDues.valueInstallment}), 0)`,
        dueCount: sql<string>`count(*)`,
        overdueTotal: sql<string>`coalesce(sum(CASE WHEN ${dueDate} < ${today} THEN ${salesDues.valueInstallment} ELSE 0 END), 0)`,
        overdueCount: sql<string>`count(*) FILTER (WHERE ${dueDate} < ${today})`,
        upcomingTotal: sql<string>`coalesce(sum(CASE WHEN ${dueDate} >= ${today} THEN ${salesDues.valueInstallment} ELSE 0 END), 0)`,
        upcomingCount: sql<string>`count(*) FILTER (WHERE ${dueDate} >= ${today})`,
      })
      .from(salesDues)
      .innerJoin(sales, eq(salesDues.salesId, sales.id))
      .where(and(...conditions));

    const row = rows[0];
    const totalOutstanding = roundMoney(decNum(row?.totalOutstanding));
    const overdueTotal = roundMoney(decNum(row?.overdueTotal));
    const upcomingTotal = roundMoney(decNum(row?.upcomingTotal));
    const dueCount = Number(row?.dueCount ?? 0);
    const overdueCount = Number(row?.overdueCount ?? 0);
    const upcomingCount = Number(row?.upcomingCount ?? 0);

    return {
      timezone,
      totalOutstanding,
      dueCount,
      overdueTotal,
      overdueCount,
      overdueRatePercent: ratePercent(overdueTotal, totalOutstanding),
      overdueCountSharePercent: ratePercent(overdueCount, dueCount),
      upcomingTotal,
      upcomingCount,
      upcomingRatePercent: ratePercent(upcomingTotal, totalOutstanding),
      upcomingCountSharePercent: ratePercent(upcomingCount, dueCount),
    };
  }

  public async aging(enterpriseId: string, query: AnalyticsReceivablesQuery) {
    const timezone = query.timezone ?? "America/Sao_Paulo";
    const today = analyticsLocalTodaySql(timezone);
    const dueDate = dueDateUtcSql();

    const conditions = [
      eq(sales.enterprisesId, enterpriseId),
      eq(sales.type, "VENDA"),
      eq(sales.status, "FINALIZADA"),
    ];
    if (query.sellerId) conditions.push(eq(sales.sellerId, query.sellerId));
    if (query.memberId) conditions.push(eq(sales.memberId, query.memberId));

    const agingBucket = sql<string>`CASE
          WHEN ${dueDate} >= ${today} THEN 'a_vencer'
          WHEN ${today} - ${dueDate} <= 30 THEN 'vencido_1_30'
          WHEN ${today} - ${dueDate} <= 60 THEN 'vencido_31_60'
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
    const totalCount = rows.reduce((sum, r) => sum + Number(r.count), 0);

    return {
      timezone,
      buckets: bucketOrder.map((key) => {
        const row = byBucket.get(key);
        const total = roundMoney(decNum(row?.total));
        const count = Number(row?.count ?? 0);
        return {
          bucket: key,
          label: agingBucketLabels[key] ?? key,
          total,
          count,
          sharePercent: ratePercent(total, totalAmount),
          countSharePercent: ratePercent(count, totalCount),
        };
      }),
      totalAmount: roundMoney(totalAmount),
      totalCount,
    };
  }
}

export const receivablesAnalyticsService = new ReceivablesAnalyticsService();
