import { eq } from "drizzle-orm";
import { db, typeSped } from "../../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";
import {
  isPostgresForeignKeyViolation,
  isPostgresUniqueViolation,
} from "../../../../shared/db/postgres-errors.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../../shared/audit/entity-types.js";
import type {
  CreateMaintainerTypeSpedInput,
  PatchMaintainerTypeSpedInput,
} from "./schema.js";

export class MaintainerTypeSpedService {
  private async getById(id: string) {
    const row = (
      await db.select().from(typeSped).where(eq(typeSped.id, id)).limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Tipo SPED nao encontrado",
        "TYPE_SPED_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    input: CreateMaintainerTypeSpedInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(typeSped)
        .values({
          type: input.type,
          description: input.description.trim(),
          generateInventory: input.generateInventory ?? true,
        })
        .returning();
      if (!row) {
        throw new Error("Falha ao criar tipo SPED");
      }
      await recordCreateAudit({
        entityType: EntityTypes.TYPE_SPED,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Tipo SPED em conflito (tipo duplicado)",
          "TYPE_SPED_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    typeSpedId: string,
    input: PatchMaintainerTypeSpedInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(typeSpedId);
    const now = new Date();

    try {
      const [row] = await db
        .update(typeSped)
        .set({
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.generateInventory !== undefined
            ? { generateInventory: input.generateInventory }
            : {}),
          updatedAt: now,
        })
        .where(eq(typeSped.id, typeSpedId))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Tipo SPED nao encontrado",
          "TYPE_SPED_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.TYPE_SPED,
        entityId: typeSpedId,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Tipo SPED em conflito (tipo duplicado)",
          "TYPE_SPED_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(typeSpedId: string, audit: EntityAuditContext) {
    const existing = await this.getById(typeSpedId);
    try {
      const [row] = await db
        .delete(typeSped)
        .where(eq(typeSped.id, typeSpedId))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Tipo SPED nao encontrado",
          "TYPE_SPED_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.TYPE_SPED,
        entityId: typeSpedId,
        action: "DELETE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresForeignKeyViolation(err)) {
        throw new ConflictError(
          "Tipo SPED possui vinculos ativos e nao pode ser excluido",
          "TYPE_SPED_IN_USE",
        );
      }
      throw err;
    }
  }
}

export const maintainerTypeSpedService = new MaintainerTypeSpedService();
