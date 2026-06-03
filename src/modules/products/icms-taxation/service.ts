import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { icmsTaxation } from "../../../db/schema.js";
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
  CreateIcmsTaxationInput,
  ListIcmsTaxationQuery,
  PatchIcmsTaxationInput,
} from "./schema.js";

export class IcmsTaxationService {
  public async list(query: ListIcmsTaxationQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(icmsTaxation)
        .orderBy(asc(icmsTaxation.description), asc(icmsTaxation.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(icmsTaxation),
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const rows = await db
      .select()
      .from(icmsTaxation)
      .where(eq(icmsTaxation.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundError(
        "Tributacao do ICMS nao encontrada",
        "ICMS_TAXATION_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    input: CreateIcmsTaxationInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(icmsTaxation)
        .values({
          icms: input.icms.trim().toUpperCase(),
          description: input.description.trim().toUpperCase(),
          icmsRate: (input.icmsRate ?? 0).toString(),
          simplesIcmsRate: (input.simplesIcmsRate ?? 0).toString(),
        })
        .returning();
      if (!row) {
        throw new Error("Falha ao criar tributacao do ICMS");
      }
      await recordCreateAudit({
        entityType: EntityTypes.ICMS_TAXATION,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Tributacao do ICMS em conflito (icms duplicado)",
          "ICMS_TAXATION_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    icmsTaxationId: string,
    input: PatchIcmsTaxationInput,
    audit: EntityAuditContext,
  ) {
    const rows = await db
      .select()
      .from(icmsTaxation)
      .where(eq(icmsTaxation.id, icmsTaxationId))
      .limit(1);
    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError(
        "Tributacao do ICMS nao encontrada",
        "ICMS_TAXATION_NOT_FOUND",
      );
    }

    const now = new Date();

    try {
      const [row] = await db
        .update(icmsTaxation)
        .set({
          ...(input.icms !== undefined
            ? { icms: input.icms.trim().toUpperCase() }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim().toUpperCase() }
            : {}),
          ...(input.icmsRate !== undefined
            ? { icmsRate: input.icmsRate.toString() }
            : {}),
          ...(input.simplesIcmsRate !== undefined
            ? { simplesIcmsRate: input.simplesIcmsRate.toString() }
            : {}),
          updatedAt: now,
        })
        .where(and(eq(icmsTaxation.id, icmsTaxationId)))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Tributacao do ICMS nao encontrada",
          "ICMS_TAXATION_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.ICMS_TAXATION,
        entityId: icmsTaxationId,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Tributacao do ICMS em conflito (icms duplicado)",
          "ICMS_TAXATION_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(icmsTaxationId: string, audit: EntityAuditContext) {
    const existing = await this.getById(icmsTaxationId);
    const [row] = await db
      .delete(icmsTaxation)
      .where(eq(icmsTaxation.id, icmsTaxationId))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Tributacao do ICMS nao encontrada",
        "ICMS_TAXATION_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.ICMS_TAXATION,
      entityId: icmsTaxationId,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const icmsTaxationService = new IcmsTaxationService();
