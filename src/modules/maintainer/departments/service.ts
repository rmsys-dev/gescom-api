import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/schema.js";
import {
  departmentDefaultPermissions,
  departments,
} from "../../../db/schema.js";
import {
  softDeleteValues,
  touchUpdatedAt,
} from "../../../shared/db/record-lifecycle.js";
import {
  ConflictError,
  InternalServerError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { invalidateReferenceDepartments } from "../../../shared/cache/reference-data-cache.js";
import { getPermissionsForReference } from "../../auth/default-permissions.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  recordSoftDeleteAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import type {
  CreateMaintainerDepartmentInput,
  PatchMaintainerDepartmentInput,
} from "./schema.js";

export class MaintainerDepartmentsService {
  public async create(
    input: CreateMaintainerDepartmentInput,
    audit: EntityAuditContext,
  ) {
    const perms = getPermissionsForReference(input.permissionReference);
    try {
      const [created] = await db.transaction(async (tx) => {
        const [row] = await tx
          .insert(departments)
          .values({
            name: input.name.trim(),
            description: input.description?.trim() ?? null,
            permissionReference: input.permissionReference,
          })
          .returning();

        if (!row) {
          throw new InternalServerError("Falha ao criar departamento");
        }

        if (perms.length > 0) {
          await tx.insert(departmentDefaultPermissions).values(
            perms.map((permission) => ({
              departmentId: row.id,
              permission,
              status: "ALLOW" as const,
            })),
          );
        }

        return [row] as const;
      });
      invalidateReferenceDepartments();
      await recordCreateAudit({
        entityType: EntityTypes.DEPARTMENTS,
        entityId: created.id,
        after: created,
        ctx: audit,
      });
      return created;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Departamento em conflito (nome duplicado)",
          "DEPARTMENT_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    departmentId: string,
    input: PatchMaintainerDepartmentInput,
    audit: EntityAuditContext,
  ) {
    const rows = await db
      .select()
      .from(departments)
      .where(
        and(eq(departments.id, departmentId), isNull(departments.deletedAt)),
      )
      .limit(1);
    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError(
        "Departamento nao encontrado",
        "DEPARTMENT_NOT_FOUND",
      );
    }

    const now = new Date();
    const isDeleteOperation = input.softDelete === true;

    if (isDeleteOperation) {
      try {
        const [row] = await db.transaction(async (tx) => {
          await tx
            .update(departmentDefaultPermissions)
            .set(softDeleteValues(now))
            .where(
              and(
                eq(departmentDefaultPermissions.departmentId, departmentId),
                isNull(departmentDefaultPermissions.deletedAt),
              ),
            );

          const [updated] = await tx
            .update(departments)
            .set({
              ...softDeleteValues(now),
              status: "INATIVO" as const,
            })
            .where(
              and(
                eq(departments.id, departmentId),
                isNull(departments.deletedAt),
              ),
            )
            .returning();

          if (!updated) {
            throw new NotFoundError(
              "Departamento nao encontrado",
              "DEPARTMENT_NOT_FOUND",
            );
          }
          await recordSoftDeleteAudit({
            entityType: EntityTypes.DEPARTMENTS,
            entityId: departmentId,
            before: existing,
            after: updated,
            ctx: audit,
            tx,
          });
          return [updated] as const;
        });
        invalidateReferenceDepartments();
        return row;
      } catch (err) {
        if (isPostgresUniqueViolation(err)) {
          throw new ConflictError(
            "Departamento em conflito (nome duplicado)",
            "DEPARTMENT_CONFLICT",
          );
        }
        throw err;
      }
    }

    const refChanged =
      input.permissionReference !== undefined &&
      input.permissionReference !== existing.permissionReference;

    try {
      const [row] = await db.transaction(async (tx) => {
        if (refChanged && input.permissionReference !== undefined) {
          await tx
            .update(departmentDefaultPermissions)
            .set(softDeleteValues(now))
            .where(
              and(
                eq(departmentDefaultPermissions.departmentId, departmentId),
                isNull(departmentDefaultPermissions.deletedAt),
              ),
            );

          const newPerms = getPermissionsForReference(
            input.permissionReference,
          );
          if (newPerms.length > 0) {
            await tx.insert(departmentDefaultPermissions).values(
              newPerms.map((permission) => ({
                departmentId,
                permission,
                status: "ALLOW" as const,
              })),
            );
          }
        }

        const [updated] = await tx
          .update(departments)
          .set({
            ...(input.name !== undefined ? { name: input.name.trim() } : {}),
            ...(input.description !== undefined
              ? { description: input.description?.trim() ?? null }
              : {}),
            ...(input.permissionReference !== undefined
              ? { permissionReference: input.permissionReference }
              : {}),
            ...touchUpdatedAt(now),
          })
          .where(
            and(
              eq(departments.id, departmentId),
              isNull(departments.deletedAt),
            ),
          )
          .returning();

        if (!updated) {
          throw new NotFoundError(
            "Departamento nao encontrado",
            "DEPARTMENT_NOT_FOUND",
          );
        }
        await recordEntityAudit({
          entityType: EntityTypes.DEPARTMENTS,
          entityId: departmentId,
          action: "UPDATE",
          before: toAuditRecord(existing),
          after: toAuditRecord(updated),
          ctx: audit,
          tx,
        });
        return [updated] as const;
      });
      invalidateReferenceDepartments();
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Departamento em conflito (nome duplicado)",
          "DEPARTMENT_CONFLICT",
        );
      }
      throw err;
    }
  }
}

export const maintainerDepartmentsService = new MaintainerDepartmentsService();
