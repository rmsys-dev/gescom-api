import { asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { measurementUnits } from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import type {
  CreateUnitInput,
  ListUnitsQuery,
  PatchUnitInput,
} from "./schema.js";

export class UnitsService {
  public async list(query: ListUnitsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(measurementUnits)
        .orderBy(
          asc(measurementUnits.description),
          asc(measurementUnits.id),
        )
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(measurementUnits)
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
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

  public async create(input: CreateUnitInput, audit: EntityAuditContext) {
    try {
      const [row] = await db
        .insert(measurementUnits)
        .values({
          unit: input.unit,
          description: input.description.trim(),
          compatible: input.compatible ?? null,
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
    input: PatchUnitInput,
    audit: EntityAuditContext,
  ) {
    const rows = await db
      .select()
      .from(measurementUnits)
      .where(
        eq(measurementUnits.id, unitId),
      )
      .limit(1);
    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError(
        "Unidade de medida nao encontrada",
        "UNIT_NOT_FOUND",
      );
    }

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
          updatedAt: now,
        })
        .where(
          eq(measurementUnits.id, unitId),
        )
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
      throw new NotFoundError("Unidade de medida nao encontrada", "UNIT_NOT_FOUND");
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

export const unitsService = new UnitsService();
