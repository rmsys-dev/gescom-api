import { asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { typeSped } from "../../../db/schema.js";
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
  CreateTypeSpedInput,
  ListTypeSpedQuery,
  PatchTypeSpedInput,
} from "./schema.js";

export class TypeSpedService {
  public async list(query: ListTypeSpedQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(typeSped)
        .orderBy(asc(typeSped.description), asc(typeSped.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(typeSped),
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const rows = await db
      .select()
      .from(typeSped)
      .where(eq(typeSped.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundError(
        "Tipo SPED nao encontrado",
        "TYPE_SPED_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(input: CreateTypeSpedInput, audit: EntityAuditContext) {
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
    input: PatchTypeSpedInput,
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
  }
}

export const typeSpedService = new TypeSpedService();
