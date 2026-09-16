import { and, asc, count, desc, eq, gte, inArray, lte, sql, } from "drizzle-orm";
import { db } from "../../db/index.js";
import { enterprisesMembers, paymentTypes, sales, salesDues, salesPayments, } from "../../db/schema.js";
import { resolveListPagination } from "../../shared/pagination/pagination-params.js";
import { effectiveCompletionDateSql } from "../sales/analytics/scope.js";
import { salesService } from "../sales/service.js";
import { applyGeneratedPayments, applyMemberCodes, collectGeneratedSaleIdsNeedingPayments, } from "./harbour-sale-payload.js";
const MIGRATION_DATE_TIMEZONE = "America/Sao_Paulo";
export class MigrationsService {
    listScope(enterpriseId, query) {
        const filters = [eq(sales.enterprisesId, enterpriseId)];
        if (query.type) {
            filters.push(eq(sales.type, query.type));
        }
        if (query.status) {
            filters.push(eq(sales.status, query.status));
        }
        if (query.dateFrom && query.dateTo) {
            const effective = effectiveCompletionDateSql(MIGRATION_DATE_TIMEZONE);
            filters.push(and(gte(effective, sql `${query.dateFrom}::date`), lte(effective, sql `${query.dateTo}::date`)));
        }
        return and(...filters);
    }
    async loadMemberCodesByIds(memberIds) {
        const ids = [...new Set(memberIds)];
        const codesByMemberId = new Map();
        if (ids.length === 0)
            return codesByMemberId;
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
    async loadPaymentTypesByIds(paymentTypeIds) {
        const ids = [...new Set(paymentTypeIds.filter(Boolean))];
        if (ids.length === 0) {
            return new Map();
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
    async loadPaymentsBySaleIds(saleIds) {
        const paymentsBySaleId = new Map();
        for (const saleId of saleIds) {
            paymentsBySaleId.set(saleId, []);
        }
        if (saleIds.length === 0)
            return paymentsBySaleId;
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
            this.loadPaymentTypesByIds(payments.map((payment) => payment.paymentTypeId)),
        ]);
        const duesByPaymentId = new Map();
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
            };
            const list = paymentsBySaleId.get(payment.salesId) ?? [];
            list.push(mapped);
            paymentsBySaleId.set(payment.salesId, list);
        }
        return paymentsBySaleId;
    }
    async listSales(enterpriseId, query = {}) {
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
        const details = await Promise.all(idRows.map((row) => salesService.getById(enterpriseId, row.id)));
        const withMemberCodes = applyMemberCodes(details, await this.loadMemberCodesByIds(details.map((sale) => sale.memberId)));
        const generatedSaleIds = collectGeneratedSaleIdsNeedingPayments(withMemberCodes);
        const items = applyGeneratedPayments(withMemberCodes, await this.loadPaymentsBySaleIds(generatedSaleIds));
        return { items, total, limit, offset };
    }
}
export const migrationsService = new MigrationsService();
