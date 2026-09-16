import { count } from "drizzle-orm";
import { db } from "../../db/schema.js";
/** Conta linhas com o mesmo predicado usado em listagens paginadas via db.query. */
export const countRowsWhere = async (table, whereClause) => {
    const query = db.select({ c: count() }).from(table);
    const rows = whereClause ? await query.where(whereClause) : await query;
    return Number(rows[0]?.c ?? 0);
};
