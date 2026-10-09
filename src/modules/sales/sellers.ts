import { and, asc, count, eq, ilike, isNull, notInArray, or, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { enterprisesMembers, users } from "../../db/schema.js";
import { resolveListPagination } from "../../shared/pagination/pagination-params.js";
import { SELLER_INELIGIBLE_MEMBER_CLASSES } from "./sale-service-shared.js";
import type { ListSaleSellersQuery } from "./schema.js";

/** Membros que podem ser vendedores da venda (mesma regra de `assertSellerInEnterprise`). */
export async function listSaleSellers(enterpriseId: string, query: ListSaleSellersQuery = {}) {
  const { limit, offset } = resolveListPagination(query);
  const filters = [
    eq(enterprisesMembers.enterpriseId, enterpriseId),
    eq(enterprisesMembers.status, "ATIVO"),
    isNull(enterprisesMembers.deletedAt),
    isNull(users.deletedAt),
    notInArray(enterprisesMembers.class, [...SELLER_INELIGIBLE_MEMBER_CLASSES]),
  ];
  if (query.search) {
    const term = `%${query.search}%`;
    filters.push(
      or(ilike(users.userName, term), sql`cast(${enterprisesMembers.code} as text) ilike ${term}`)!,
    );
  }
  const where = and(...filters);
  const [items, totalRows] = await Promise.all([
    db
      .select({
        userId: users.id,
        userName: users.userName,
        code: enterprisesMembers.code,
        class: enterprisesMembers.class,
      })
      .from(enterprisesMembers)
      .innerJoin(users, eq(users.id, enterprisesMembers.userId))
      .where(where)
      .orderBy(asc(users.userName), asc(users.id))
      .limit(limit)
      .offset(offset),
    db
      .select({ c: count() })
      .from(enterprisesMembers)
      .innerJoin(users, eq(users.id, enterprisesMembers.userId))
      .where(where),
  ]);
  return { items, total: Number(totalRows[0]?.c ?? 0), limit, offset };
}
