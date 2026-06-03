import { and, eq, isNull, type Column, type SQL } from "drizzle-orm";

export const touchUpdatedAt = (now: Date) => ({
  updatedAt: now,
});

type TableWithDeletedAt = { deletedAt: Column };
type TableWithIdAndDeletedAt = { id: Column; deletedAt: Column };

/** Predicado: registro não soft-deleted. */
export const notDeleted = (table: TableWithDeletedAt): SQL =>
  isNull(table.deletedAt);

/** WHERE id + notDeleted — padrão para UPDATE/PATCH. */
export const whereActiveById = (
  table: TableWithIdAndDeletedAt,
  id: string,
): SQL => and(eq(table.id, id), isNull(table.deletedAt))!;

type SoftDeleteBase = {
  deletedAt: Date;
  updatedAt: Date;
};

export function softDeleteValues(now: Date): SoftDeleteBase;
export function softDeleteValues<TStatus extends string>(
  now: Date,
  options: { status: TStatus },
): SoftDeleteBase & { status: TStatus };
export function softDeleteValues<TStatus extends string>(
  now: Date,
  options?: { status: TStatus },
) {
  const base: SoftDeleteBase = {
    deletedAt: now,
    updatedAt: now,
  };
  return options ? { ...base, status: options.status } : base;
}

/** Soft delete de vínculo membro-empresa (enterprises_members). */
export const membershipSoftDeleteValues = (now: Date) => ({
  ...softDeleteValues(now, { status: "INATIVO" as const }),
  approvedAt: null,
});

/** Soft delete de vínculo membro-departamento (members_departments). */
export const memberDepartmentSoftDeleteValues = (now: Date) => ({
  ...softDeleteValues(now, { status: "INATIVO" as const }),
  mainDepartment: false,
});

