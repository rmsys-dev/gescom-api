import { asc, isNull } from "drizzle-orm";
import { db } from "../../../db/schema.js";
import { countries } from "../../../db/schema.js";
import { memoryCache } from "../../../shared/cache/memory-cache.js";
import {
  referenceCacheKeys,
  REFERENCE_DATA_TTL_MS,
} from "../../../shared/cache/reference-data-cache.js";
import { paginateArray } from "../../../shared/pagination/paginate-array.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import type { ListCountriesQuery } from "./schema.js";

const fetchAllCountries = () =>
  db.query.countries.findMany({
    where: isNull(countries.deletedAt),
    orderBy: [asc(countries.countryName), asc(countries.id)],
  });

export class AddressesCountriesService {
  public async list(query: ListCountriesQuery) {
    const { limit, offset } = resolveListPagination(query);
    const allItems = await memoryCache.getOrSet(
      referenceCacheKeys.countries,
      REFERENCE_DATA_TTL_MS,
      fetchAllCountries,
    );

    return paginateArray(allItems, limit, offset);
  }
}

export const addressesCountriesService = new AddressesCountriesService();
