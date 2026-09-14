import { and, asc, count, eq, ilike } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productTypes, typeSped } from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type { ListTypesProductsQuery } from "./schema.js";

type ProductTypeWithTypeSped = typeof productTypes.$inferSelect & {
  typeSped: typeof typeSped.$inferSelect;
};

export class TypesProductsService {
  private toResponse(row: ProductTypeWithTypeSped) {
    const { typeSpedId: _typeSpedId, typeSped: typeSpedRow, ...rest } = row;
    return { ...rest, typeSped: typeSpedRow };
  }

  public async list(query: ListTypesProductsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [];
    if (query.description) {
      conditions.push(
        ilike(productTypes.description, `%${query.description}%`),
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [items, totalRows] = await Promise.all([
      db.query.productTypes.findMany({
        where,
        with: { typeSped: true },
        orderBy: [asc(productTypes.description), asc(productTypes.id)],
        limit,
        offset,
      }),
      db.select({ c: count() }).from(productTypes).where(where),
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
    const row = await db.query.productTypes.findFirst({
      where: eq(productTypes.id, id),
      with: { typeSped: true },
    });
    if (!row) {
      throw new NotFoundError(
        "Tipo de produto nao encontrado",
        "TYPE_PRODUCT_NOT_FOUND",
      );
    }
    return this.toResponse(row);
  }
}

export const typesProductsService = new TypesProductsService();
