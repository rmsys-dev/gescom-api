import { and, asc, count, eq, ilike } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productsNcm } from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type { ListProductsNcmQuery } from "./schema.js";
import { fiscalCodeIlikeCondition } from "../shared/fiscal-code-filter.js";

export class ProductsNcmService {
  public async list(query: ListProductsNcmQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [];
    if (query.description) {
      conditions.push(ilike(productsNcm.description, `%${query.description}%`));
    }
    if (query.ncm) {
      conditions.push(fiscalCodeIlikeCondition(productsNcm.ncm, query.ncm));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(productsNcm)
        .where(where)
        .orderBy(asc(productsNcm.ncm), asc(productsNcm.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(productsNcm).where(where),
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const rows = await db
      .select()
      .from(productsNcm)
      .where(eq(productsNcm.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundError(
        "NCM de produto nao encontrado",
        "PRODUCTS_NCM_NOT_FOUND",
      );
    }
    return row;
  }
}

export const productsNcmService = new ProductsNcmService();
