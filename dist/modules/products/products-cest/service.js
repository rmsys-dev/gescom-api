import { and, asc, count, eq, ilike } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productsCest } from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import { fiscalCodeIlikeCondition } from "../shared/fiscal-code-filter.js";
export class ProductsCestService {
    toResponse(row) {
        const { productsNcmId: _productsNcmId, productsNcm: productsNcmRow, ...rest } = row;
        return { ...rest, productsNcm: productsNcmRow };
    }
    async list(query = {}) {
        const { limit, offset } = resolveListPagination(query);
        const conditions = [];
        if (query.description) {
            conditions.push(ilike(productsCest.description, `%${query.description}%`));
        }
        if (query.cest) {
            conditions.push(fiscalCodeIlikeCondition(productsCest.cest, query.cest));
        }
        const where = conditions.length > 0 ? and(...conditions) : undefined;
        const [items, totalRows] = await Promise.all([
            db.query.productsCest.findMany({
                where,
                with: { productsNcm: true },
                orderBy: [asc(productsCest.cest), asc(productsCest.id)],
                limit,
                offset,
            }),
            db.select({ c: count() }).from(productsCest).where(where),
        ]);
        const total = Number(totalRows[0]?.c ?? 0);
        return {
            items: items.map((row) => this.toResponse(row)),
            total,
            limit,
            offset,
        };
    }
    async getById(id) {
        const row = await db.query.productsCest.findFirst({
            where: eq(productsCest.id, id),
            with: { productsNcm: true },
        });
        if (!row) {
            throw new NotFoundError("CEST de produto nao encontrado", "PRODUCTS_CEST_NOT_FOUND");
        }
        return this.toResponse(row);
    }
}
export const productsCestService = new ProductsCestService();
