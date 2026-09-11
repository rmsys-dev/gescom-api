import { and, asc, count, eq, ilike } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { icmsTaxation } from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type { ListIcmsTaxationQuery } from "./schema.js";
import { fiscalCodeIlikeCondition } from "../shared/fiscal-code-filter.js";

export class IcmsTaxationService {
  public async list(query: ListIcmsTaxationQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [];
    if (query.description) {
      conditions.push(
        ilike(icmsTaxation.description, `%${query.description}%`),
      );
    }
    if (query.icms) {
      conditions.push(fiscalCodeIlikeCondition(icmsTaxation.icms, query.icms));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(icmsTaxation)
        .where(where)
        .orderBy(asc(icmsTaxation.description), asc(icmsTaxation.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(icmsTaxation).where(where),
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const rows = await db
      .select()
      .from(icmsTaxation)
      .where(eq(icmsTaxation.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundError(
        "Tributacao do ICMS nao encontrada",
        "ICMS_TAXATION_NOT_FOUND",
      );
    }
    return row;
  }
}

export const icmsTaxationService = new IcmsTaxationService();
