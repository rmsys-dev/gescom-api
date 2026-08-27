import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import { modules } from "../../db/schema.js";
import { NotFoundError } from "../../shared/errors/app-error.js";
import { memoryCache } from "../../shared/cache/memory-cache.js";
import {
  referenceCacheKeys,
  REFERENCE_DATA_TTL_MS,
} from "../../shared/cache/reference-data-cache.js";
import { paginateArray } from "../../shared/pagination/paginate-array.js";
import { resolveListPagination } from "../../shared/pagination/pagination-params.js";
import type { ListModulesQuery } from "./schema.js";

const fetchAllModules = () =>
  db.query.modules.findMany({
    where: and(eq(modules.status, "ATIVO"), isNull(modules.deletedAt)),
    orderBy: [asc(modules.name), asc(modules.id)],
  });

export class ModulesService {
  public async list(query: ListModulesQuery) {
    const { limit, offset } = resolveListPagination(query);
    const allItems = await memoryCache.getOrSet(
      referenceCacheKeys.modules,
      REFERENCE_DATA_TTL_MS,
      fetchAllModules,
    );

    return paginateArray(allItems, limit, offset);
  }

  public async getById(moduleId: string) {
    const row = await db.query.modules.findFirst({
      where: and(
        eq(modules.id, moduleId),
        eq(modules.status, "ATIVO"),
        isNull(modules.deletedAt),
      ),
    });
    if (!row) {
      throw new NotFoundError("Modulo nao encontrado", "MODULE_NOT_FOUND");
    }
    return row;
  }
}

export const modulesService = new ModulesService();
