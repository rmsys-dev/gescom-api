import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/schema.js";
import { modules } from "../../../db/schema.js";
import {
  softDeleteValues,
  touchUpdatedAt,
} from "../../../shared/db/record-lifecycle.js";
import {
  ConflictError,
  InternalServerError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { invalidateReferenceModules } from "../../../shared/cache/reference-data-cache.js";
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
  CreateMaintainerModuleInput,
  PatchMaintainerModuleInput,
} from "./schema.js";

export class MaintainerModulesService {
  public async create(
    input: CreateMaintainerModuleInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [created] = await db
        .insert(modules)
        .values({
          name: input.name.trim(),
          description: input.description?.trim() ?? null,
          reference: input.reference,
        })
        .returning();

      if (!created) {
        throw new InternalServerError("Falha ao criar modulo");
      }

      invalidateReferenceModules();
      await recordCreateAudit({
        entityType: EntityTypes.MODULES,
        entityId: created.id,
        after: created,
        ctx: audit,
      });
      return created;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Modulo em conflito (nome ou referencia duplicados)",
          "MODULE_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    moduleId: string,
    input: PatchMaintainerModuleInput,
    audit: EntityAuditContext,
  ) {
    const rows = await db
      .select()
      .from(modules)
      .where(and(eq(modules.id, moduleId), isNull(modules.deletedAt)))
      .limit(1);
    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError("Modulo nao encontrado", "MODULE_NOT_FOUND");
    }

    const now = new Date();
    const isDeleteOperation = input.softDelete === true;

    try {
      if (isDeleteOperation) {
        const [updated] = await db
          .update(modules)
          .set({
            ...softDeleteValues(now),
            status: "INATIVO" as const,
          })
          .where(and(eq(modules.id, moduleId), isNull(modules.deletedAt)))
          .returning();

        if (!updated) {
          throw new NotFoundError("Modulo nao encontrado", "MODULE_NOT_FOUND");
        }

        await recordSoftDeleteAudit({
          entityType: EntityTypes.MODULES,
          entityId: moduleId,
          before: existing,
          after: updated,
          ctx: audit,
        });
        invalidateReferenceModules();
        return updated;
      }

      const [updated] = await db
        .update(modules)
        .set({
          ...(input.name !== undefined ? { name: input.name.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() ?? null }
            : {}),
          ...(input.reference !== undefined
            ? { reference: input.reference }
            : {}),
          ...touchUpdatedAt(now),
        })
        .where(and(eq(modules.id, moduleId), isNull(modules.deletedAt)))
        .returning();

      if (!updated) {
        throw new NotFoundError("Modulo nao encontrado", "MODULE_NOT_FOUND");
      }

      await recordEntityAudit({
        entityType: EntityTypes.MODULES,
        entityId: moduleId,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(updated),
        ctx: audit,
      });
      invalidateReferenceModules();
      return updated;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Modulo em conflito (nome ou referencia duplicados)",
          "MODULE_CONFLICT",
        );
      }
      throw err;
    }
  }
}

export const maintainerModulesService = new MaintainerModulesService();
