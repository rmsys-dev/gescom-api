import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/schema.js";
import { ceps } from "../../../db/schema.js";
import {
  softDeleteValues,
  touchUpdatedAt,
} from "../../../shared/db/record-lifecycle.js";
import {
  ConflictError,
  InternalServerError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import {
  isPostgresUniqueViolation,
  requireActiveCity,
} from "../shared/address-helpers.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  recordSoftDeleteAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import type {
  CreateMaintainerCepInput,
  PatchMaintainerCepInput,
} from "./schema.js";

export class MaintainerCepsService {
  public async create(
    input: CreateMaintainerCepInput,
    audit: EntityAuditContext,
  ) {
    await requireActiveCity(input.cityId);
    try {
      const [row] = await db
        .insert(ceps)
        .values({
          cepNumber: input.cepNumber,
          address: input.address.trim(),
          number: input.number.trim(),
          complement: input.complement?.trim() ?? null,
          neighborhood: input.neighborhood.trim(),
          cityId: input.cityId,
        })
        .returning();
      if (!row) {
        throw new InternalServerError("Falha ao criar CEP");
      }
      await recordCreateAudit({
        entityType: EntityTypes.CEPS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "CEP em conflito (numero duplicado na cidade)",
          "CEP_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    cepId: string,
    input: PatchMaintainerCepInput,
    audit: EntityAuditContext,
  ) {
    const rows = await db
      .select()
      .from(ceps)
      .where(and(eq(ceps.id, cepId), isNull(ceps.deletedAt)))
      .limit(1);
    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError("CEP nao encontrado", "CEP_NOT_FOUND");
    }

    const now = new Date();

    if (input.softDelete === true) {
      const [row] = await db
        .update(ceps)
        .set(softDeleteValues(now))
        .where(and(eq(ceps.id, cepId), isNull(ceps.deletedAt)))
        .returning();
      if (!row) {
        throw new NotFoundError("CEP nao encontrado", "CEP_NOT_FOUND");
      }
      await recordSoftDeleteAudit({
        entityType: EntityTypes.CEPS,
        entityId: cepId,
        before: existing,
        after: row,
        ctx: audit,
      });
      return row;
    }

    if (input.cityId !== undefined) {
      await requireActiveCity(input.cityId);
    }

    try {
      const [row] = await db
        .update(ceps)
        .set({
          ...(input.cepNumber !== undefined
            ? { cepNumber: input.cepNumber }
            : {}),
          ...(input.address !== undefined
            ? { address: input.address.trim() }
            : {}),
          ...(input.number !== undefined
            ? { number: input.number.trim() }
            : {}),
          ...(input.complement !== undefined
            ? { complement: input.complement?.trim() ?? null }
            : {}),
          ...(input.neighborhood !== undefined
            ? { neighborhood: input.neighborhood.trim() }
            : {}),
          ...(input.cityId !== undefined ? { cityId: input.cityId } : {}),
          ...touchUpdatedAt(now),
        })
        .where(and(eq(ceps.id, cepId), isNull(ceps.deletedAt)))
        .returning();
      if (!row) {
        throw new NotFoundError("CEP nao encontrado", "CEP_NOT_FOUND");
      }
      await recordEntityAudit({
        entityType: EntityTypes.CEPS,
        entityId: cepId,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "CEP em conflito (numero duplicado na cidade)",
          "CEP_CONFLICT",
        );
      }
      throw err;
    }
  }
}

export const maintainerCepsService = new MaintainerCepsService();
