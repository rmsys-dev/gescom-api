import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { typeSped } from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import {
  isPostgresForeignKeyViolation,
  isPostgresUniqueViolation,
} from "../../../shared/db/postgres-errors.js";
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
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(typeSped.enterprisesId, enterpriseId)];
    if (id) base.push(eq(typeSped.id, id));
    return and(...base);
  }

  public async list(enterpriseId: string, query: ListTypeSpedQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = eq(typeSped.enterprisesId, enterpriseId);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(typeSped)
        .where(where)
        .orderBy(asc(typeSped.description), asc(typeSped.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(typeSped).where(where),
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select()
        .from(typeSped)
        .where(this.scope(enterpriseId, id))
        .limit(1)
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
    enterpriseId: string,
    input: CreateTypeSpedInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(typeSped)
        .values({
          enterprisesId: enterpriseId,
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
          "Tipo SPED em conflito (tipo duplicado na empresa)",
          "TYPE_SPED_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    typeSpedId: string,
    input: PatchTypeSpedInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, typeSpedId);
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
        .where(this.scope(enterpriseId, typeSpedId))
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
          "Tipo SPED em conflito (tipo duplicado na empresa)",
          "TYPE_SPED_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(
    enterpriseId: string,
    typeSpedId: string,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, typeSpedId);
    try {
      const [row] = await db
        .delete(typeSped)
        .where(this.scope(enterpriseId, typeSpedId))
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

export const typeSpedService = new TypeSpedService();
