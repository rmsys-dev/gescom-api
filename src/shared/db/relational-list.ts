import { count, type SQL } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "../../db/schema.js";

/** Conta linhas com o mesmo predicado usado em listagens paginadas via db.query. */
export const countRowsWhere = async (
  table: PgTable,
  whereClause: SQL | undefined,
): Promise<number> => {
  const query = db.select({ c: count() }).from(table);
  const rows = whereClause ? await query.where(whereClause) : await query;
  return Number(rows[0]?.c ?? 0);
};
