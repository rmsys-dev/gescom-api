import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { sectors } from "../../../db/schema.js";
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
  CreateSectorInput,
  ListSectorsQuery,
  PatchSectorInput,
} from "./schema.js";

export class SectorsService {
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(sectors.enterprisesId, enterpriseId)];
    if (id) base.push(eq(sectors.id, id));
    return and(...base);
  }

  public async list(enterpriseId: string, query: ListSectorsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scope(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(sectors)
        .where(where)
        .orderBy(asc(sectors.description), asc(sectors.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(sectors).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select()
        .from(sectors)
        .where(this.scope(enterpriseId, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Setor de estoque nao encontrado",
        "SECTOR_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreateSectorInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(sectors)
        .values({
          enterprisesId: enterpriseId,
          description: input.description.trim(),
        })
        .returning();
      if (!row) throw new Error("Falha ao criar setor de estoque");
      await recordCreateAudit({
        entityType: EntityTypes.SECTORS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Descricao de setor ja existe na empresa",
          "SECTOR_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchSectorInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    try {
      const [row] = await db
        .update(sectors)
        .set({
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          updatedAt: new Date(),
        })
        .where(this.scope(enterpriseId, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Setor de estoque nao encontrado",
          "SECTOR_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.SECTORS,
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
          "Descricao de setor ja existe na empresa",
          "SECTOR_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(
    enterpriseId: string,
    id: string,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    const [row] = await db
      .delete(sectors)
      .where(this.scope(enterpriseId, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Setor de estoque nao encontrado",
        "SECTOR_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.SECTORS,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const sectorsService = new SectorsService();
