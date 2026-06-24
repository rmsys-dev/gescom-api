import { and, asc, count, eq } from "drizzle-orm";
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
import { assertStockSectorBelongsToEnterprise } from "../balance.js";
import type {
  CreateStockLocationInput,
  ListStockLocationsQuery,
  PatchStockLocationInput,
} from "./schema.js";

export class StockLocationsService {
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(stockSectors.enterprisesId, enterpriseId)];
    if (id) base.push(eq(stockLocations.id, id));
    return and(...base);
  }

  public async list(enterpriseId: string, query: ListStockLocationsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scope(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: stockLocations.id,
          box: stockLocations.box,
          description: stockLocations.description,
          stockSectorId: stockLocations.stockSectorId,
          status: stockLocations.status,
          createdAt: stockLocations.createdAt,
          updatedAt: stockLocations.updatedAt,
        })
        .from(stockLocations)
        .innerJoin(
          stockSectors,
          eq(stockLocations.stockSectorId, stockSectors.id),
        )
        .where(where)
        .orderBy(asc(stockLocations.box), asc(stockLocations.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(stockLocations)
        .innerJoin(
          stockSectors,
          eq(stockLocations.stockSectorId, stockSectors.id),
        )
        .where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select({
          id: stockLocations.id,
          box: stockLocations.box,
          description: stockLocations.description,
          stockSectorId: stockLocations.stockSectorId,
          status: stockLocations.status,
          createdAt: stockLocations.createdAt,
          updatedAt: stockLocations.updatedAt,
        })
        .from(stockLocations)
        .innerJoin(
          stockSectors,
          eq(stockLocations.stockSectorId, stockSectors.id),
        )
        .where(this.scope(enterpriseId, id))
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
    enterpriseId: string,
    input: CreateStockLocationInput,
    audit: EntityAuditContext,
  ) {
    await assertStockSectorBelongsToEnterprise(
      enterpriseId,
      input.stockSectorId,
    );
    try {
      const [row] = await db
        .insert(stockLocations)
        .values({
          box: input.box?.trim() ?? null,
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
    enterpriseId: string,
    id: string,
    input: PatchStockLocationInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    if (input.stockSectorId) {
      await assertStockSectorBelongsToEnterprise(
        enterpriseId,
        input.stockSectorId,
      );
    }
    try {
      const [row] = await db
        .update(stockLocations)
        .set({
          ...(input.box !== undefined ? { box: input.box.trim() } : {}),
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

  public async delete(
    enterpriseId: string,
    id: string,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
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
