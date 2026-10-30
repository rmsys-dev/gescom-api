import { and, asc, count, eq, ilike } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productsCest, productsNcm } from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type { ListProductsCestQuery } from "./schema.js";
import { fiscalCodeIlikeCondition } from "../shared/fiscal-code-filter.js";

type ProductsCestWithNcm = typeof productsCest.$inferSelect & {
  productsNcm: typeof productsNcm.$inferSelect;
};

export class ProductsCestService {
  private toResponse(row: ProductsCestWithNcm) {
    const {
      productsNcmId: _productsNcmId,
      productsNcm: productsNcmRow,
      ...rest
    } = row;
    return { ...rest, productsNcm: productsNcmRow };
  }

  public async list(query: ListProductsCestQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [];
    if (query.description) {
      conditions.push(
        ilike(productsCest.description, `%${query.description}%`),
      );
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

  public async getById(id: string) {
    const row = await db.query.productsCest.findFirst({
      where: eq(productsCest.id, id),
      with: { productsNcm: true },
    });
    if (!row) {
      throw new NotFoundError(
        "CEST de produto nao encontrado",
        "PRODUCTS_CEST_NOT_FOUND",
      );
    }
    return this.toResponse(row);
  }
}

export const productsCestService = new ProductsCestService();
