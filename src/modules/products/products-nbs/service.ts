import { and, asc, count, eq, ilike } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productsNbs } from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type { ListProductsNbsQuery } from "./schema.js";
import { fiscalCodeIlikeCondition } from "../shared/fiscal-code-filter.js";

export class ProductsNbsService {
  public async list(query: ListProductsNbsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [];
    if (query.description) {
      conditions.push(ilike(productsNbs.description, `%${query.description}%`));
    }
    if (query.nbs) {
      conditions.push(fiscalCodeIlikeCondition(productsNbs.nbs, query.nbs));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(productsNbs)
        .where(where)
        .orderBy(asc(productsNbs.lc116Item), asc(productsNbs.nbs))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(productsNbs).where(where),
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const row = (
      await db.select().from(productsNbs).where(eq(productsNbs.id, id)).limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "NBS de servico nao encontrado",
        "PRODUCTS_NBS_NOT_FOUND",
      );
    }
    return row;
  }
}

export const productsNbsService = new ProductsNbsService();
