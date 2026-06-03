import { and, asc, eq, isNull } from "drizzle-orm";
import { db, cities } from "../../../db/schema.js";
import { countRowsWhere } from "../../../shared/db/relational-list.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type { ListCitiesQuery } from "./schema.js";

export class AddressesCitiesService {
  public async list(query: ListCitiesQuery) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [isNull(cities.deletedAt)];

    if (query.stateId !== undefined) {
      conditions.push(eq(cities.stateId, query.stateId));
    }

    const whereClause = and(...conditions);

    const [items, total] = await Promise.all([
      db.query.cities.findMany({
        where: whereClause,
        orderBy: [asc(cities.citieName), asc(cities.id)],
        limit,
        offset,
      }),
      countRowsWhere(cities, whereClause),
    ]);

    return {
      items,
      total,
      limit,
      offset,
    };
  }
}

export const addressesCitiesService = new AddressesCitiesService();
