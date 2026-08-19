import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productsEnterprises, stockBatches } from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
  ValidationError,
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
import {
  stockBatchDetailWith,
  toStockBatchResponse,
  type StockBatchWithProductEnterprise,
} from "../nested-response.js";
import type {
  CreateStockBatchInput,
  ListStockBatchesQuery,
  PatchStockBatchInput,
} from "./schema.js";

export class StockBatchesService {
  private enterpriseProductsEnterprisesIds(enterpriseId: string) {
    return db
      .select({ id: productsEnterprises.id })
      .from(productsEnterprises)
      .where(eq(productsEnterprises.enterprisesId, enterpriseId));
  }

  private scopeWhere(enterpriseId: string, id?: string) {
    const conditions = [
      inArray(
        stockBatches.productsEnterprisesId,
        this.enterpriseProductsEnterprisesIds(enterpriseId),
      ),
    ];
    if (id) conditions.push(eq(stockBatches.id, id));
    return and(...conditions);
  }

  private async assertProductEnterprise(
    enterpriseId: string,
    productsEnterprisesId: string,
  ) {
    const row = (
      await db
        .select({
          id: productsEnterprises.id,
          controlsBatch: productsEnterprises.controlsBatch,
        })
        .from(productsEnterprises)
        .where(
          and(
            eq(productsEnterprises.id, productsEnterprisesId),
            eq(productsEnterprises.enterprisesId, enterpriseId),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Produto da empresa nao encontrado",
        "PRODUCT_ENTERPRISE_NOT_FOUND",
      );
    }
    if (!row.controlsBatch) {
      throw new ValidationError(
        [
          {
            path: "body.productsEnterprisesId",
            message: "Produto nao esta configurado para controle por lote",
          },
        ],
        "Controle de lote desabilitado",
      );
    }
    return row;
  }

  private async getPlainById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select({
          id: stockBatches.id,
          batchNumber: stockBatches.batchNumber,
          productsEnterprisesId: stockBatches.productsEnterprisesId,
          manufacturingDate: stockBatches.manufacturingDate,
          expiryDate: stockBatches.expiryDate,
          documentRef: stockBatches.documentRef,
          status: stockBatches.status,
          notes: stockBatches.notes,
          createdAt: stockBatches.createdAt,
          updatedAt: stockBatches.updatedAt,
        })
        .from(stockBatches)
        .innerJoin(
          productsEnterprises,
          eq(stockBatches.productsEnterprisesId, productsEnterprises.id),
        )
        .where(
          and(
            eq(productsEnterprises.enterprisesId, enterpriseId),
            eq(stockBatches.id, id),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError("Lote nao encontrado", "STOCK_BATCH_NOT_FOUND");
    }
    return row;
  }

  public async list(enterpriseId: string, query: ListStockBatchesQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scopeWhere(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db.query.stockBatches.findMany({
        where,
        with: stockBatchDetailWith,
        orderBy: [asc(stockBatches.expiryDate), asc(stockBatches.batchNumber)],
        limit,
        offset,
      }),
      db.select({ c: count() }).from(stockBatches).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return {
      items: items.map((row) =>
        toStockBatchResponse(row as StockBatchWithProductEnterprise),
      ),
      total,
      limit,
      offset,
    };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = await db.query.stockBatches.findFirst({
      where: this.scopeWhere(enterpriseId, id),
      with: stockBatchDetailWith,
    });
    if (!row) {
      throw new NotFoundError("Lote nao encontrado", "STOCK_BATCH_NOT_FOUND");
    }
    return toStockBatchResponse(row as StockBatchWithProductEnterprise);
  }

  public async create(
    enterpriseId: string,
    input: CreateStockBatchInput,
    audit: EntityAuditContext,
  ) {
    await this.assertProductEnterprise(
      enterpriseId,
      input.productsEnterprisesId,
    );
    try {
      const [row] = await db
        .insert(stockBatches)
        .values({
          batchNumber: input.batchNumber.trim(),
          productsEnterprisesId: input.productsEnterprisesId,
          manufacturingDate: input.manufacturingDate ?? null,
          expiryDate: input.expiryDate ?? null,
          documentRef: input.documentRef?.trim() ?? null,
          status: input.status ?? "ATIVO",
          notes: input.notes?.trim() ?? null,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar lote");
      await recordCreateAudit({
        entityType: EntityTypes.STOCK_BATCHES,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return this.getById(enterpriseId, row.id);
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Lote ja existe para este produto",
          "STOCK_BATCH_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchStockBatchInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getPlainById(enterpriseId, id);
    try {
      const [row] = await db
        .update(stockBatches)
        .set({
          ...(input.batchNumber !== undefined
            ? { batchNumber: input.batchNumber.trim() }
            : {}),
          ...(input.manufacturingDate !== undefined
            ? { manufacturingDate: input.manufacturingDate }
            : {}),
          ...(input.expiryDate !== undefined
            ? { expiryDate: input.expiryDate }
            : {}),
          ...(input.documentRef !== undefined
            ? { documentRef: input.documentRef?.trim() ?? null }
            : {}),
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.notes !== undefined
            ? { notes: input.notes?.trim() ?? null }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(stockBatches.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError("Lote nao encontrado", "STOCK_BATCH_NOT_FOUND");
      }
      await recordEntityAudit({
        entityType: EntityTypes.STOCK_BATCHES,
        entityId: id,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return this.getById(enterpriseId, id);
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Lote ja existe para este produto",
          "STOCK_BATCH_CONFLICT",
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
    const existing = await this.getPlainById(enterpriseId, id);
    const [row] = await db
      .delete(stockBatches)
      .where(eq(stockBatches.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError("Lote nao encontrado", "STOCK_BATCH_NOT_FOUND");
    }
    await recordEntityAudit({
      entityType: EntityTypes.STOCK_BATCHES,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const stockBatchesService = new StockBatchesService();
