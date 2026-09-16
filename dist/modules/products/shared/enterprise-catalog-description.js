import { and, eq, ne, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { ConflictError } from "../../../shared/errors/app-error.js";
import { normalizeTrimmedText } from "../../../shared/validation/data-normalizers.js";
export const normalizeEnterpriseCatalogDescription = (value) => normalizeTrimmedText(value).replace(/\s+/g, " ");
export const assertEnterpriseCatalogDescriptionAvailable = async (params) => {
    const normalized = normalizeEnterpriseCatalogDescription(params.description);
    const { table, enterpriseId, excludeId, conflictCode, message } = params;
    const conditions = [
        eq(table.enterprisesId, enterpriseId),
        sql `lower(${table.description}) = ${normalized.toLowerCase()}`,
    ];
    if (excludeId) {
        conditions.push(ne(table.id, excludeId));
    }
    const existing = await db
        .select({ id: table.id })
        .from(table)
        .where(and(...conditions))
        .limit(1);
    if (existing[0]) {
        throw new ConflictError(message, conflictCode);
    }
    return normalized;
};
