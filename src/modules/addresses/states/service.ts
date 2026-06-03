import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/schema.js";
import { states } from "../../../db/schema.js";
import { memoryCache } from "../../../shared/cache/memory-cache.js";
import {
  referenceCacheKeys,
  REFERENCE_DATA_TTL_MS,
} from "../../../shared/cache/reference-data-cache.js";
import { paginateArray } from "../../../shared/pagination/paginate-array.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type { ListStatesQuery } from "./schema.js";

const fetchStates = (countryId?: string) => {
  const conditions = [isNull(states.deletedAt)];

  if (countryId !== undefined) {
    conditions.push(eq(states.countryId, countryId));
  }

  return db.query.states.findMany({
    where: and(...conditions),
    orderBy: [asc(states.description), asc(states.id)],
  });
};

export class AddressesStatesService {
  public async list(query: ListStatesQuery) {
    const { limit, offset } = resolveListPagination(query);
    const cacheKey = referenceCacheKeys.states(query.countryId);
    const allItems = await memoryCache.getOrSet(
      cacheKey,
      REFERENCE_DATA_TTL_MS,
      () => fetchStates(query.countryId),
    );

    return paginateArray(allItems, limit, offset);
  }
}

export const addressesStatesService = new AddressesStatesService();
