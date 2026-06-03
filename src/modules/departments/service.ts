import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import { departments } from "../../db/schema.js";
import { NotFoundError } from "../../shared/errors/app-error.js";
import { memoryCache } from "../../shared/cache/memory-cache.js";
import {
  referenceCacheKeys,
  REFERENCE_DATA_TTL_MS,
} from "../../shared/cache/reference-data-cache.js";
import { paginateArray } from "../../shared/pagination/paginate-array.js";
import { resolveListPagination } from "../../shared/pagination/pagination-params.js";
import type { ListDepartmentsQuery } from "./schema.js";

const fetchAllDepartments = () =>
  db.query.departments.findMany({
    where: and(eq(departments.status, "ATIVO"), isNull(departments.deletedAt)),
    orderBy: [asc(departments.name), asc(departments.id)],
  });

export class DepartmentsService {
  public async list(query: ListDepartmentsQuery) {
    const { limit, offset } = resolveListPagination(query);
    const allItems = await memoryCache.getOrSet(
      referenceCacheKeys.departments,
      REFERENCE_DATA_TTL_MS,
      fetchAllDepartments,
    );

    return paginateArray(allItems, limit, offset);
  }

  public async getById(departmentId: string) {
    const row = await db.query.departments.findFirst({
      where: and(
        eq(departments.id, departmentId),
        eq(departments.status, "ATIVO"),
        isNull(departments.deletedAt),
      ),
    });
    if (!row) {
      throw new NotFoundError(
        "Departamento nao encontrado",
        "DEPARTMENT_NOT_FOUND",
      );
    }
    return row;
  }
}

export const departmentsService = new DepartmentsService();
