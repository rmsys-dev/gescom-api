import {
  and,
  asc,
  count,
  desc,
  eq,
  gte,
  inArray,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../../db/index.js";
import {
  enterprisesMembers,
  paymentTypes,
  sales,
  salesDues,
  salesPayments,
} from "../../db/schema.js";
import { resolveListPagination } from "../../shared/pagination/pagination-params.js";
import { effectiveCompletionDateSql } from "../sales/analytics/scope.js";
import { salesService } from "../sales/service.js";
import {
  applyGeneratedPayments,
  applyMemberCodes,
  collectGeneratedSaleIdsNeedingPayments,
} from "./harbour-sale-payload.js";
import type { ListMigrationSalesQuery } from "./schema.js";

const MIGRATION_DATE_TIMEZONE = "America/Sao_Paulo";

type MigrationSaleDetail = Awaited<ReturnType<typeof salesService.getById>>;
type MigrationSalePayments = MigrationSaleDetail["payments"];

type MigrationPaymentTypeSummary = {
  id: string;
  description: string;
  paymentType: string;
  status: string;
};

export class MigrationsService {
  private listScope(enterpriseId: string, query: ListMigrationSalesQuery) {
    const filters: SQL[] = [eq(sales.enterprisesId, enterpriseId)];
    if (query.type) {
      filters.push(eq(sales.type, query.type));
    }
    if (query.status) {
      filters.push(eq(sales.status, query.status));
    }
    if (query.dateFrom && query.dateTo) {
      const effective = effectiveCompletionDateSql(MIGRATION_DATE_TIMEZONE);
      filters.push(
        and(
          gte(effective, sql`${query.dateFrom}::date`),
          lte(effective, sql`${query.dateTo}::date`),
        )!,
      );
    }
    return and(...filters);
  }

  private async loadMemberCodesByIds(memberIds: string[]) {
    const ids = [...new Set(memberIds)];
    const codesByMemberId = new Map<string, number | null>();
    if (ids.length === 0) return codesByMemberId;

    const rows = await db
      .select({
        id: enterprisesMembers.id,
        code: enterprisesMembers.code,
      })
      .from(enterprisesMembers)
      .where(inArray(enterprisesMembers.id, ids));

    for (const row of rows) {
      codesByMemberId.set(row.id, row.code);
    }
    return codesByMemberId;
  }

  private async loadPaymentTypesByIds(paymentTypeIds: string[]) {
    const ids = [...new Set(paymentTypeIds.filter(Boolean))];
    if (ids.length === 0) {
      return new Map<string, MigrationPaymentTypeSummary>();
    }

    const rows = await db
      .select({
        id: paymentTypes.id,
        description: paymentTypes.description,
        paymentType: paymentTypes.paymentType,
        status: paymentTypes.status,
      })
      .from(paymentTypes)
      .where(inArray(paymentTypes.id, ids));

    return new Map(rows.map((row) => [row.id, row]));
  }

  private async loadPaymentsBySaleIds(saleIds: string[]) {
    const paymentsBySaleId = new Map<string, MigrationSalePayments>();
    for (const saleId of saleIds) {
      paymentsBySaleId.set(saleId, []);
    }
    if (saleIds.length === 0) return paymentsBySaleId;

    const payments = await db
      .select()
      .from(salesPayments)
      .where(inArray(salesPayments.salesId, saleIds))
      .orderBy(asc(salesPayments.createdAt), asc(salesPayments.id));

    const paymentIds = payments.map((payment) => payment.id);
    const [allDues, paymentTypesById] = await Promise.all([
      paymentIds.length > 0
        ? db
            .select()
            .from(salesDues)
            .where(inArray(salesDues.salesPaymentId, paymentIds))
            .orderBy(asc(salesDues.dueDate), asc(salesDues.id))
        : Promise.resolve([]),
      this.loadPaymentTypesByIds(
        payments.map((payment) => payment.paymentTypeId),
      ),
    ]);

    const duesByPaymentId = new Map<
      string,
      (typeof salesDues.$inferSelect)[]
    >();
    for (const due of allDues) {
      const dues = duesByPaymentId.get(due.salesPaymentId) ?? [];
      dues.push(due);
      duesByPaymentId.set(due.salesPaymentId, dues);
    }

    for (const payment of payments) {
      const mapped = {
        ...payment,
        paymentType: paymentTypesById.get(payment.paymentTypeId) ?? null,
        dues: duesByPaymentId.get(payment.id) ?? [],
      } as MigrationSalePayments[number];
      const list = paymentsBySaleId.get(payment.salesId) ?? [];
      list.push(mapped);
      paymentsBySaleId.set(payment.salesId, list);
    }

    return paymentsBySaleId;
  }

  public async listSales(
    enterpriseId: string,
    query: ListMigrationSalesQuery = {},
  ) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.listScope(enterpriseId, query);

    const [idRows, totalRows] = await Promise.all([
      db
        .select({ id: sales.id })
        .from(sales)
        .where(where)
        .orderBy(desc(sales.createdAt), asc(sales.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(sales).where(where),
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    const details = await Promise.all(
      idRows.map((row) => salesService.getById(enterpriseId, row.id)),
    );

    const withMemberCodes = applyMemberCodes(
      details,
      await this.loadMemberCodesByIds(details.map((sale) => sale.memberId)),
    );

    const generatedSaleIds =
      collectGeneratedSaleIdsNeedingPayments(withMemberCodes);
    const items = applyGeneratedPayments(
      withMemberCodes,
      await this.loadPaymentsBySaleIds(generatedSaleIds),
    );

    return { items, total, limit, offset };
  }
}

export const migrationsService = new MigrationsService();
