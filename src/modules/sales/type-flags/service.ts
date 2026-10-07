import { asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { typeFlags } from "../../../db/schema.js";
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
  CreateTypeFlagInput,
  ListTypeFlagsQuery,
  PatchTypeFlagInput,
} from "./schema.js";

export class TypeFlagsService {
  public async list(query: ListTypeFlagsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(typeFlags)
        .orderBy(asc(typeFlags.description), asc(typeFlags.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(typeFlags),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const row = (
      await db.select().from(typeFlags).where(eq(typeFlags.id, id)).limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError("Bandeira nao encontrada", "TYPE_FLAG_NOT_FOUND");
    }
    return row;
  }

  public async create(input: CreateTypeFlagInput, audit: EntityAuditContext) {
    try {
      const [row] = await db
        .insert(typeFlags)
        .values({
          flagCode: input.flagCode.trim(),
          description: input.description.trim(),
          status: input.status ?? "ATIVO",
        })
        .returning();
      if (!row) throw new Error("Falha ao criar bandeira");
      await recordCreateAudit({
        entityType: EntityTypes.TYPE_FLAGS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Bandeira em conflito (codigo duplicado)",
          "TYPE_FLAG_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    id: string,
    input: PatchTypeFlagInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(id);
    try {
      const [row] = await db
        .update(typeFlags)
        .set({
          ...(input.flagCode !== undefined
            ? { flagCode: input.flagCode.trim() }
            : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          updatedAt: new Date(),
        })
        .where(eq(typeFlags.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Bandeira nao encontrada",
          "TYPE_FLAG_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.TYPE_FLAGS,
        entityId: id,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Bandeira em conflito (codigo duplicado)",
          "TYPE_FLAG_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(id: string, audit: EntityAuditContext) {
    const existing = await this.getById(id);
    try {
      const [row] = await db
        .delete(typeFlags)
        .where(eq(typeFlags.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Bandeira nao encontrada",
          "TYPE_FLAG_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.TYPE_FLAGS,
        entityId: id,
        action: "DELETE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresForeignKeyViolation(err)) {
        throw new ConflictError(
          "Bandeira vinculada a tipos de pagamento",
          "TYPE_FLAG_IN_USE",
        );
      }
      throw err;
    }
  }
}

export const typeFlagsService = new TypeFlagsService();
