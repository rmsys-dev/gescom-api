import { eq } from "drizzle-orm";
import { db, measurementUnits } from "../../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../../../shared/db/postgres-errors.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../../shared/audit/entity-types.js";
import type {
  CreateMaintainerUnitInput,
  PatchMaintainerUnitInput,
} from "./schema.js";

export class MaintainerUnitsService {
  private async getById(id: string) {
    const rows = await db
      .select()
      .from(measurementUnits)
      .where(eq(measurementUnits.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundError(
        "Unidade de medida nao encontrada",
        "UNIT_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    input: CreateMaintainerUnitInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(measurementUnits)
        .values({
          unit: input.unit,
          description: input.description.trim(),
          compatible: input.compatible ?? null,
          wholeFractional: input.wholeFractional,
        })
        .returning();
      if (!row) {
        throw new Error("Falha ao criar unidade de medida");
      }
      await recordCreateAudit({
        entityType: EntityTypes.MEASUREMENT_UNITS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Unidade de medida em conflito (sigla duplicada)",
          "UNIT_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    unitId: string,
    input: PatchMaintainerUnitInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(unitId);
    const now = new Date();

    try {
      const [row] = await db
        .update(measurementUnits)
        .set({
          ...(input.unit !== undefined ? { unit: input.unit } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.compatible !== undefined
            ? { compatible: input.compatible }
            : {}),
          ...(input.wholeFractional !== undefined
            ? { wholeFractional: input.wholeFractional }
            : {}),
          updatedAt: now,
        })
        .where(eq(measurementUnits.id, unitId))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Unidade de medida nao encontrada",
          "UNIT_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.MEASUREMENT_UNITS,
        entityId: unitId,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Unidade de medida em conflito (sigla duplicada)",
          "UNIT_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(unitId: string, audit: EntityAuditContext) {
    const existing = await this.getById(unitId);
    const [row] = await db
      .delete(measurementUnits)
      .where(eq(measurementUnits.id, unitId))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Unidade de medida nao encontrada",
        "UNIT_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.MEASUREMENT_UNITS,
      entityId: unitId,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const maintainerUnitsService = new MaintainerUnitsService();
