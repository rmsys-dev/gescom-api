import { and, eq, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { enterprisesMembers, paymentTypes, productBrands, productGroups, productsEnterprises, sales, salesDues, salesItems, salesPayments, salesReturns, users, } from "../../../db/schema.js";
import { buildRankingPayload, decNum, ratePercent, roundMoney, } from "./metrics.js";
import { resolveAnalyticsPeriod } from "./period.js";
import { buildItemLineFilterConditions, buildPaymentLineFilterConditions, buildRealizedDueScope, buildReturnLineFilterConditions, buildReturnsScope, extractFilters, recognizedAmountSql, recognizedCostSql, recognizedDiscountSql, recognizedItemQuantitySql, recognizedItemRevenueSql, returnLineValueSql, } from "./scope.js";
export class DimensionsAnalyticsService {
    async byPaymentType(enterpriseId, query) {
        const period = resolveAnalyticsPeriod(query);
        const filters = extractFilters(query);
        const scope = buildRealizedDueScope(enterpriseId, period, filters);
        const paymentLineFilters = buildPaymentLineFilterConditions(filters);
        const where = and(scope, ...paymentLineFilters);
        const amount = recognizedAmountSql();
        const [rows, totalRow] = await Promise.all([
            db
                .select({
                id: paymentTypes.id,
                label: paymentTypes.description,
                revenue: sql `coalesce(sum(${amount}), 0)`,
                salesCount: sql `count(distinct ${sales.id})`,
            })
                .from(salesDues)
                .innerJoin(sales, eq(salesDues.salesId, sales.id))
                .innerJoin(salesPayments, eq(salesDues.salesPaymentId, salesPayments.id))
                .innerJoin(paymentTypes, eq(salesPayments.paymentTypeId, paymentTypes.id))
                .where(where)
                .groupBy(paymentTypes.id, paymentTypes.description)
                .orderBy(sql `sum(${amount}) desc`)
                .limit(query.limit ?? 10),
            db
                .select({
                totalRevenue: sql `coalesce(sum(${amount}), 0)`,
            })
                .from(salesDues)
                .innerJoin(sales, eq(salesDues.salesId, sales.id))
                .innerJoin(salesPayments, eq(salesDues.salesPaymentId, salesPayments.id))
                .where(where),
        ]);
        const ranking = buildRankingPayload(rows.map((row) => ({
            id: row.id,
            label: row.label,
            revenue: roundMoney(decNum(row.revenue)),
            salesCount: Number(row.salesCount),
        })), decNum(totalRow[0]?.totalRevenue));
        return {
            period: { from: period.from, to: period.to, timezone: period.timezone },
            ...ranking,
        };
    }
    async bySeller(enterpriseId, query) {
        const period = resolveAnalyticsPeriod(query);
        const filters = extractFilters(query);
        const scope = buildRealizedDueScope(enterpriseId, period, filters);
        const amount = recognizedAmountSql();
        const cost = recognizedCostSql();
        const [rows, totalRow] = await Promise.all([
            db
                .select({
                id: sales.sellerId,
                label: sales.sellerLegalName,
                revenue: sql `coalesce(sum(${amount}), 0)`,
                costTotal: sql `coalesce(sum(${cost}), 0)`,
                salesCount: sql `count(distinct ${sales.id})`,
            })
                .from(salesDues)
                .innerJoin(sales, eq(salesDues.salesId, sales.id))
                .where(scope)
                .groupBy(sales.sellerId, sales.sellerLegalName)
                .orderBy(sql `sum(${amount}) desc`)
                .limit(query.limit ?? 10),
            db
                .select({
                totalRevenue: sql `coalesce(sum(${amount}), 0)`,
            })
                .from(salesDues)
                .innerJoin(sales, eq(salesDues.salesId, sales.id))
                .where(scope),
        ]);
        const ranking = buildRankingPayload(rows.map((row) => {
            const revenue = roundMoney(decNum(row.revenue));
            const costTotal = roundMoney(decNum(row.costTotal));
            return {
                id: row.id,
                label: row.label,
                revenue,
                costTotal,
                grossProfit: roundMoney(revenue - costTotal),
                salesCount: Number(row.salesCount),
            };
        }), decNum(totalRow[0]?.totalRevenue));
        return {
            period: { from: period.from, to: period.to, timezone: period.timezone },
            ...ranking,
        };
    }
    async byCustomer(enterpriseId, query) {
        const period = resolveAnalyticsPeriod(query);
        const filters = extractFilters(query);
        const scope = and(buildRealizedDueScope(enterpriseId, period, filters), sql `${sales.memberId} is not null`);
        const amount = recognizedAmountSql();
        const cost = recognizedCostSql();
        const [rows, totalRow] = await Promise.all([
            db
                .select({
                id: sales.memberId,
                label: users.userName,
                revenue: sql `coalesce(sum(${amount}), 0)`,
                costTotal: sql `coalesce(sum(${cost}), 0)`,
                salesCount: sql `count(distinct ${sales.id})`,
            })
                .from(salesDues)
                .innerJoin(sales, eq(salesDues.salesId, sales.id))
                .leftJoin(enterprisesMembers, eq(sales.memberId, enterprisesMembers.id))
                .leftJoin(users, eq(enterprisesMembers.userId, users.id))
                .where(scope)
                .groupBy(sales.memberId, users.userName)
                .orderBy(sql `sum(${amount}) desc`)
                .limit(query.limit ?? 10),
            db
                .select({
                totalRevenue: sql `coalesce(sum(${amount}), 0)`,
            })
                .from(salesDues)
                .innerJoin(sales, eq(salesDues.salesId, sales.id))
                .where(scope),
        ]);
        const ranking = buildRankingPayload(rows.map((row) => {
            const revenue = roundMoney(decNum(row.revenue));
            const costTotal = roundMoney(decNum(row.costTotal));
            return {
                id: row.id,
                label: row.label ?? "Cliente sem nome",
                revenue,
                costTotal,
                grossProfit: roundMoney(revenue - costTotal),
                salesCount: Number(row.salesCount),
            };
        }), decNum(totalRow[0]?.totalRevenue));
        return {
            period: { from: period.from, to: period.to, timezone: period.timezone },
            ...ranking,
        };
    }
    async topProducts(enterpriseId, query) {
        const period = resolveAnalyticsPeriod(query);
        const filters = extractFilters(query);
        const scope = buildRealizedDueScope(enterpriseId, period, filters);
        const itemLineFilters = buildItemLineFilterConditions(filters);
        const where = and(scope, ...itemLineFilters);
        const sortBy = query.sortBy ?? "revenue";
        const netRevenue = recognizedItemRevenueSql();
        const netQuantity = recognizedItemQuantitySql();
        const [rows, totalRow] = await Promise.all([
            db
                .select({
                id: productsEnterprises.id,
                code: productsEnterprises.code,
                label: productsEnterprises.description,
                revenue: sql `coalesce(sum(${netRevenue}), 0)`,
                quantity: sql `coalesce(sum(${netQuantity}), 0)`,
                salesCount: sql `count(distinct ${sales.id})`,
            })
                .from(salesDues)
                .innerJoin(sales, eq(salesDues.salesId, sales.id))
                .innerJoin(salesItems, eq(salesItems.salesId, sales.id))
                .innerJoin(productsEnterprises, eq(salesItems.productsEnterprisesId, productsEnterprises.id))
                .where(where)
                .groupBy(productsEnterprises.id, productsEnterprises.code, productsEnterprises.description)
                .orderBy(sortBy === "quantity"
                ? sql `sum(${netQuantity}) desc`
                : sql `sum(${netRevenue}) desc`)
                .limit(query.limit ?? 10),
            db
                .select({
                totalRevenue: sql `coalesce(sum(${netRevenue}), 0)`,
            })
                .from(salesDues)
                .innerJoin(sales, eq(salesDues.salesId, sales.id))
                .innerJoin(salesItems, eq(salesItems.salesId, sales.id))
                .where(where),
        ]);
        const ranking = buildRankingPayload(rows.map((row) => ({
            id: row.id,
            code: row.code,
            label: row.label,
            revenue: roundMoney(decNum(row.revenue)),
            quantity: decNum(row.quantity),
            salesCount: Number(row.salesCount),
        })), decNum(totalRow[0]?.totalRevenue));
        return {
            period: { from: period.from, to: period.to, timezone: period.timezone },
            sortBy,
            ...ranking,
        };
    }
    async byProductGroup(enterpriseId, query) {
        return this.byProductDimension(enterpriseId, query, "group");
    }
    async byProductBrand(enterpriseId, query) {
        return this.byProductDimension(enterpriseId, query, "brand");
    }
    async byProductDimension(enterpriseId, query, dimension) {
        const period = resolveAnalyticsPeriod(query);
        const filters = extractFilters(query);
        const scope = buildRealizedDueScope(enterpriseId, period, filters);
        const itemLineFilters = buildItemLineFilterConditions(filters);
        const where = and(scope, ...itemLineFilters);
        const netRevenue = recognizedItemRevenueSql();
        const netQuantity = recognizedItemQuantitySql();
        const dimTable = dimension === "group" ? productGroups : productBrands;
        const dimIdCol = dimension === "group"
            ? productsEnterprises.productGroupId
            : productsEnterprises.productBrandId;
        const baseFrom = () => db
            .select({
            id: dimTable.id,
            label: dimTable.description,
            revenue: sql `coalesce(sum(${netRevenue}), 0)`,
            quantity: sql `coalesce(sum(${netQuantity}), 0)`,
            salesCount: sql `count(distinct ${sales.id})`,
        })
            .from(salesDues)
            .innerJoin(sales, eq(salesDues.salesId, sales.id))
            .innerJoin(salesItems, eq(salesItems.salesId, sales.id))
            .innerJoin(productsEnterprises, eq(salesItems.productsEnterprisesId, productsEnterprises.id))
            .innerJoin(dimTable, eq(dimIdCol, dimTable.id))
            .where(where);
        const [rows, totalRow] = await Promise.all([
            baseFrom()
                .groupBy(dimTable.id, dimTable.description)
                .orderBy(sql `sum(${netRevenue}) desc`)
                .limit(query.limit ?? 10),
            db
                .select({
                totalRevenue: sql `coalesce(sum(${netRevenue}), 0)`,
            })
                .from(salesDues)
                .innerJoin(sales, eq(salesDues.salesId, sales.id))
                .innerJoin(salesItems, eq(salesItems.salesId, sales.id))
                .innerJoin(productsEnterprises, eq(salesItems.productsEnterprisesId, productsEnterprises.id))
                .innerJoin(dimTable, eq(dimIdCol, dimTable.id))
                .where(where),
        ]);
        const ranking = buildRankingPayload(rows.map((row) => ({
            id: row.id,
            label: row.label,
            revenue: roundMoney(decNum(row.revenue)),
            quantity: decNum(row.quantity),
            salesCount: Number(row.salesCount),
        })), decNum(totalRow[0]?.totalRevenue));
        return {
            period: { from: period.from, to: period.to, timezone: period.timezone },
            ...ranking,
        };
    }
    async returnsSummary(enterpriseId, query) {
        const period = resolveAnalyticsPeriod(query);
        const filters = extractFilters(query);
        const returnsScope = buildReturnsScope(enterpriseId, period, filters);
        const returnLineFilters = buildReturnLineFilterConditions(filters);
        const realizedScope = buildRealizedDueScope(enterpriseId, period, filters);
        const amount = recognizedAmountSql();
        const [returnsAgg, grossAgg, topProducts] = await Promise.all([
            db
                .select({
                returnsTotal: sql `coalesce(sum(${returnLineValueSql()}), 0)`,
                returnCount: sql `count(*)`,
            })
                .from(salesReturns)
                .innerJoin(sales, eq(salesReturns.salesId, sales.id))
                .innerJoin(salesItems, eq(salesReturns.saleItemId, salesItems.id))
                .where(returnsScope),
            db
                .select({
                liquidRevenue: sql `coalesce(sum(${amount}), 0)`,
                discountTotal: sql `coalesce(sum(${recognizedDiscountSql()}), 0)`,
            })
                .from(salesDues)
                .innerJoin(sales, eq(salesDues.salesId, sales.id))
                .where(realizedScope),
            db
                .select({
                id: productsEnterprises.id,
                label: productsEnterprises.description,
                quantity: sql `coalesce(sum(${salesReturns.quantity}), 0)`,
                revenue: sql `coalesce(sum(${returnLineValueSql()}), 0)`,
            })
                .from(salesReturns)
                .innerJoin(sales, eq(salesReturns.salesId, sales.id))
                .innerJoin(salesItems, eq(salesReturns.saleItemId, salesItems.id))
                .innerJoin(productsEnterprises, eq(salesItems.productsEnterprisesId, productsEnterprises.id))
                .where(and(returnsScope, ...returnLineFilters))
                .groupBy(productsEnterprises.id, productsEnterprises.description)
                .orderBy(sql `sum(${returnLineValueSql()}) desc`)
                .limit(query.limit ?? 10),
        ]);
        const returnsTotal = roundMoney(decNum(returnsAgg[0]?.returnsTotal));
        const liquidRevenue = decNum(grossAgg[0]?.liquidRevenue);
        const discountTotal = decNum(grossAgg[0]?.discountTotal);
        const grossRevenue = roundMoney(liquidRevenue + discountTotal);
        const topReturnedProducts = topProducts.map((row) => ({
            id: row.id,
            label: row.label,
            quantity: decNum(row.quantity),
            revenue: roundMoney(decNum(row.revenue)),
            sharePercent: ratePercent(decNum(row.revenue), returnsTotal),
        }));
        return {
            period: { from: period.from, to: period.to, timezone: period.timezone },
            returnsTotal,
            returnCount: Number(returnsAgg[0]?.returnCount ?? 0),
            returnRatePercent: ratePercent(returnsTotal, liquidRevenue),
            grossRevenue,
            topReturnedProducts,
        };
    }
}
export const dimensionsAnalyticsService = new DimensionsAnalyticsService();
