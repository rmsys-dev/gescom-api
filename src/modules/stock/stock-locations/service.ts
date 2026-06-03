import { asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { stockLocations, stockSectors } from "../../../db/schema.js";
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
  CreateStockLocationInput,
  ListStockLocationsQuery,
  PatchStockLocationInput,
} from "./schema.js";

export class StockLocationsService {
  private async assertSectorExists(stockSectorId: string) {
    const row = (
      await db
        .select({ id: stockSectors.id })
        .from(stockSectors)
        .where(eq(stockSectors.id, stockSectorId))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Setor de estoque nao encontrado",
        "STOCK_SECTOR_NOT_FOUND",
      );
    }
  }

  public async list(query: ListStockLocationsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(stockLocations)
        .orderBy(asc(stockLocations.code), asc(stockLocations.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(stockLocations),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const row = (
      await db
        .select()
        .from(stockLocations)
        .where(eq(stockLocations.id, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Locacao fisica de estoque nao encontrada",
        "STOCK_LOCATION_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    input: CreateStockLocationInput,
    audit: EntityAuditContext,
  ) {
    await this.assertSectorExists(input.stockSectorId);
    try {
      const [row] = await db
        .insert(stockLocations)
        .values({
          code: input.code.trim(),
          description: input.description?.trim() ?? null,
          stockSectorId: input.stockSectorId,
          status: input.status ?? "ATIVO",
        })
        .returning();
      if (!row) throw new Error("Falha ao criar locacao fisica de estoque");
      await recordCreateAudit({
        entityType: EntityTypes.STOCK_LOCATIONS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Codigo de locacao ja existe no setor",
          "STOCK_LOCATION_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    id: string,
    input: PatchStockLocationInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(id);
    if (input.stockSectorId) {
      await this.assertSectorExists(input.stockSectorId);
    }
    try {
      const [row] = await db
        .update(stockLocations)
        .set({
          ...(input.code !== undefined ? { code: input.code.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description?.trim() ?? null }
            : {}),
          ...(input.stockSectorId !== undefined
            ? { stockSectorId: input.stockSectorId }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          updatedAt: new Date(),
        })
        .where(eq(stockLocations.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Locacao fisica de estoque nao encontrada",
          "STOCK_LOCATION_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.STOCK_LOCATIONS,
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
          "Codigo de locacao ja existe no setor",
          "STOCK_LOCATION_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(id: string, audit: EntityAuditContext) {
    const existing = await this.getById(id);
    const [row] = await db
      .delete(stockLocations)
      .where(eq(stockLocations.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Locacao fisica de estoque nao encontrada",
        "STOCK_LOCATION_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.STOCK_LOCATIONS,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const stockLocationsService = new StockLocationsService();
