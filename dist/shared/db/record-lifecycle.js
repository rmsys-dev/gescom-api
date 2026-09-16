import { and, eq, isNull } from "drizzle-orm";
export const touchUpdatedAt = (now) => ({
    updatedAt: now,
});
/** Predicado: registro não soft-deleted. */
export const notDeleted = (table) => isNull(table.deletedAt);
/** WHERE id + notDeleted — padrão para UPDATE/PATCH. */
export const whereActiveById = (table, id) => and(eq(table.id, id), isNull(table.deletedAt));
export function softDeleteValues(now, options) {
    const base = {
        deletedAt: now,
        updatedAt: now,
    };
    return options ? { ...base, status: options.status } : base;
}
/** Soft delete de vínculo membro-empresa (enterprises_members). */
export const membershipSoftDeleteValues = (now) => ({
    ...softDeleteValues(now, { status: "INATIVO" }),
    approvedAt: null,
    approvedBy: null,
});
/** Soft delete de vínculo membro-módulo (member_modules). */
export const memberModuleSoftDeleteValues = (now) => softDeleteValues(now, { status: "INATIVO" });
