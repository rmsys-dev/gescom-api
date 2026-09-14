import { asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { typeSped } from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type { ListTypeSpedQuery } from "./schema.js";

export class TypeSpedService {
  public async list(query: ListTypeSpedQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(typeSped)
        .orderBy(asc(typeSped.description), asc(typeSped.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(typeSped),
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const row = (
      await db.select().from(typeSped).where(eq(typeSped.id, id)).limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Tipo SPED nao encontrado",
        "TYPE_SPED_NOT_FOUND",
      );
    }
    return row;
  }
}

export const typeSpedService = new TypeSpedService();
