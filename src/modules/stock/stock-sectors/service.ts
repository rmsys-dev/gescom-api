import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { stockSectors } from "../../../db/schema.js";
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
  CreateStockSectorInput,
  ListStockSectorsQuery,
  PatchStockSectorInput,
} from "./schema.js";

export class StockSectorsService {
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(stockSectors.enterprisesId, enterpriseId)];
    if (id) base.push(eq(stockSectors.id, id));
    return and(...base);
  }

  public async list(enterpriseId: string, query: ListStockSectorsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scope(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(stockSectors)
        .where(where)
        .orderBy(asc(stockSectors.description), asc(stockSectors.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(stockSectors).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select()
        .from(stockSectors)
        .where(this.scope(enterpriseId, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Setor de estoque nao encontrado",
        "STOCK_SECTOR_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreateStockSectorInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(stockSectors)
        .values({
          enterprisesId: enterpriseId,
          description: input.description.trim(),
        })
        .returning();
      if (!row) throw new Error("Falha ao criar setor de estoque");
      await recordCreateAudit({
        entityType: EntityTypes.STOCK_SECTORS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Descricao de setor ja existe na empresa",
          "STOCK_SECTOR_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchStockSectorInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    try {
      const [row] = await db
        .update(stockSectors)
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
          "STOCK_SECTOR_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.STOCK_SECTORS,
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
          "STOCK_SECTOR_CONFLICT",
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
      .delete(stockSectors)
      .where(this.scope(enterpriseId, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Setor de estoque nao encontrado",
        "STOCK_SECTOR_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.STOCK_SECTORS,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const stockSectorsService = new StockSectorsService();
