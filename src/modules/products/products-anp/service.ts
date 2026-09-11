import { asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productsAnp } from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type { ListProductsAnpQuery } from "./schema.js";

export class ProductsAnpService {
  public async list(query: ListProductsAnpQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(productsAnp)
        .orderBy(asc(productsAnp.anp), asc(productsAnp.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(productsAnp),
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const rows = await db
      .select()
      .from(productsAnp)
      .where(eq(productsAnp.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundError(
        "ANP de produto nao encontrado",
        "PRODUCTS_ANP_NOT_FOUND",
      );
    }
    return row;
  }
}

export const productsAnpService = new ProductsAnpService();
