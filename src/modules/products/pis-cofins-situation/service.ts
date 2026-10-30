import { and, asc, count, eq, ilike } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { pisCofinsSituation } from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type { ListPisCofinsSituationQuery } from "./schema.js";
import { fiscalCodeIlikeCondition } from "../shared/fiscal-code-filter.js";

export class PisCofinsSituationService {
  public async list(query: ListPisCofinsSituationQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [];
    if (query.description) {
      conditions.push(
        ilike(pisCofinsSituation.description, `%${query.description}%`),
      );
    }
    if (query.cst) {
      conditions.push(
        fiscalCodeIlikeCondition(pisCofinsSituation.cst, query.cst),
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(pisCofinsSituation)
        .where(where)
        .orderBy(
          asc(pisCofinsSituation.description),
          asc(pisCofinsSituation.id),
        )
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(pisCofinsSituation).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const row = (
      await db
        .select()
        .from(pisCofinsSituation)
        .where(eq(pisCofinsSituation.id, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Situacao PIS/COFINS nao encontrada",
        "PIS_COFINS_SITUATION_NOT_FOUND",
      );
    }
    return row;
  }
}

export const pisCofinsSituationService = new PisCofinsSituationService();
