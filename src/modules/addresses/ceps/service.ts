import { and, asc, eq, isNull } from "drizzle-orm";
import { db, ceps } from "../../../db/schema.js";
import { countRowsWhere } from "../../../shared/db/relational-list.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type { ListCepsQuery } from "./schema.js";

export class AddressesCepsService {
  public async list(query: ListCepsQuery) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [isNull(ceps.deletedAt)];

    if (query.cityId !== undefined) {
      conditions.push(eq(ceps.cityId, query.cityId));
    }

    if (query.cepNumber !== undefined) {
      conditions.push(eq(ceps.cepNumber, query.cepNumber));
    }

    const whereClause = and(...conditions);

    const [items, total] = await Promise.all([
      db.query.ceps.findMany({
        where: whereClause,
        orderBy: [asc(ceps.cepNumber), asc(ceps.id)],
        limit,
        offset,
      }),
      countRowsWhere(ceps, whereClause),
    ]);

    return {
      items,
      total,
      limit,
      offset,
    };
  }
}

export const addressesCepsService = new AddressesCepsService();
