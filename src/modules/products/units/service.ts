import { and, asc, count, eq, ilike } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { measurementUnits } from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type { ListUnitsQuery } from "./schema.js";

export class UnitsService {
  public async list(query: ListUnitsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [];
    if (query.description) {
      conditions.push(
        ilike(
          measurementUnits.description,
          `%${query.description.toUpperCase()}%`,
        ),
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(measurementUnits)
        .where(where)
        .orderBy(
          asc(measurementUnits.description),
          asc(measurementUnits.id),
        )
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(measurementUnits).where(where),
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const rows = await db
      .select()
      .from(measurementUnits)
      .where(eq(measurementUnits.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundError(
        "Unidade de medida nao encontrada",
        "UNIT_NOT_FOUND",
      );
    }
    return row;
  }
}

export const unitsService = new UnitsService();
