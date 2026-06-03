import { asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { stockSectors } from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
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
  public async list(query: ListStockSectorsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(stockSectors)
        .orderBy(asc(stockSectors.description), asc(stockSectors.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(stockSectors),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const row = (
      await db
        .select()
        .from(stockSectors)
        .where(eq(stockSectors.id, id))
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

  public async create(input: CreateStockSectorInput, audit: EntityAuditContext) {
    const [row] = await db
      .insert(stockSectors)
      .values({ description: input.description.trim() })
      .returning();
    if (!row) throw new Error("Falha ao criar setor de estoque");
    await recordCreateAudit({
      entityType: EntityTypes.STOCK_SECTORS,
      entityId: row.id,
      after: row,
      ctx: audit,
    });
    return row;
  }

  public async patch(
    id: string,
    input: PatchStockSectorInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(id);
    const [row] = await db
      .update(stockSectors)
      .set({
        ...(input.description !== undefined
          ? { description: input.description.trim() }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(stockSectors.id, id))
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
  }

  public async delete(id: string, audit: EntityAuditContext) {
    const existing = await this.getById(id);
    const [row] = await db
      .delete(stockSectors)
      .where(eq(stockSectors.id, id))
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
