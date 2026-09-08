import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  productsEnterprises,
  stockBatchBalances,
  stockBatches,
} from "../../../db/schema.js";
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
  applyProductStockBalanceDelta,
  assertBatchBelongsToProduct,
  assertLocationBelongsToEnterprise,
  getProductEnterpriseForStock,
} from "../balance.js";
import {
  stockBatchDetailWith,
  locationDetailWith,
  toStockBatchResponse,
  toLocationResponse,
  type StockBatchWithProductEnterprise,
  type LocationWithSector,
} from "../nested-response.js";
import type {
  CreateStockBatchBalanceInput,
  ListStockBatchBalancesQuery,
  PatchStockBatchBalanceInput,
} from "./schema.js";

type StockBatchBalanceWithRelations = typeof stockBatchBalances.$inferSelect & {
  stockBatch: StockBatchWithProductEnterprise;
  location: LocationWithSector;
};

export class StockBatchBalancesService {
  private toResponse(row: StockBatchBalanceWithRelations) {
    const {
      stockBatchId: _stockBatchId,
      locationsId: _locationsId,
      stockBatch: stockBatchRow,
      location: locationRow,
      ...rest
    } = row;
    return {
      ...rest,
      stockBatch: toStockBatchResponse(stockBatchRow),
      location: toLocationResponse(locationRow),
    };
  }

  private enterpriseStockBatchIds(enterpriseId: string) {
    return db
      .select({ id: stockBatches.id })
      .from(stockBatches)
      .innerJoin(
        productsEnterprises,
        eq(stockBatches.productsEnterprisesId, productsEnterprises.id),
      )
      .where(eq(productsEnterprises.enterprisesId, enterpriseId));
  }

  private scopeWhere(enterpriseId: string, id?: string) {
    const conditions = [
      inArray(
        stockBatchBalances.stockBatchId,
        this.enterpriseStockBatchIds(enterpriseId),
      ),
    ];
    if (id) conditions.push(eq(stockBatchBalances.id, id));
    return and(...conditions);
  }

  private async assertRefs(
    enterpriseId: string,
    input: { stockBatchId: string; locationsId: string },
  ): Promise<{ productsEnterprisesId: string }> {
    const batch = (
      await db
        .select({
          id: stockBatches.id,
          productsEnterprisesId: stockBatches.productsEnterprisesId,
        })
        .from(stockBatches)
        .where(eq(stockBatches.id, input.stockBatchId))
        .limit(1)
    )[0];
    if (!batch) {
      throw new NotFoundError("Lote nao encontrado", "STOCK_BATCH_NOT_FOUND");
    }
    const pe = await getProductEnterpriseForStock(
      enterpriseId,
      batch.productsEnterprisesId,
    );
    if (!pe.controlsBatch) {
      throw new ValidationError(
        [
          {
            path: "body.stockBatchId",
            message: "Produto sem controle de lote",
          },
        ],
        "Controle de lote desabilitado",
      );
    }
    await assertBatchBelongsToProduct(
      batch.productsEnterprisesId,
      input.stockBatchId,
    );
    await assertLocationBelongsToEnterprise(
      enterpriseId,
      input.locationsId,
    );
    return { productsEnterprisesId: batch.productsEnterprisesId };
  }

  private async getPlainById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select({
          id: stockBatchBalances.id,
          stockBatchId: stockBatchBalances.stockBatchId,
          locationsId: stockBatchBalances.locationsId,
          quantity: stockBatchBalances.quantity,
          productsEnterprisesId: stockBatches.productsEnterprisesId,
          createdAt: stockBatchBalances.createdAt,
          updatedAt: stockBatchBalances.updatedAt,
        })
        .from(stockBatchBalances)
        .innerJoin(
          stockBatches,
          eq(stockBatchBalances.stockBatchId, stockBatches.id),
        )
        .innerJoin(
          productsEnterprises,
          eq(stockBatches.productsEnterprisesId, productsEnterprises.id),
        )
        .where(
          and(
            eq(productsEnterprises.enterprisesId, enterpriseId),
            eq(stockBatchBalances.id, id),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Saldo de lote nao encontrado",
        "STOCK_BATCH_BALANCE_NOT_FOUND",
      );
    }
    return row;
  }

  public async list(
    enterpriseId: string,
    query: ListStockBatchBalancesQuery = {},
  ) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scopeWhere(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db.query.stockBatchBalances.findMany({
        where,
        with: {
          stockBatch: {
            with: stockBatchDetailWith,
          },
          location: {
            with: locationDetailWith,
          },
        },
        orderBy: [asc(stockBatchBalances.id)],
        limit,
        offset,
      }),
      db.select({ c: count() }).from(stockBatchBalances).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return {
      items: items.map((row) =>
        this.toResponse(row as StockBatchBalanceWithRelations),
      ),
      total,
      limit,
      offset,
    };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = await db.query.stockBatchBalances.findFirst({
      where: this.scopeWhere(enterpriseId, id),
      with: {
        stockBatch: {
          with: stockBatchDetailWith,
        },
        location: {
          with: locationDetailWith,
        },
      },
    });
    if (!row) {
      throw new NotFoundError(
        "Saldo de lote nao encontrado",
        "STOCK_BATCH_BALANCE_NOT_FOUND",
      );
    }
    return this.toResponse(row as StockBatchBalanceWithRelations);
  }

  public async create(
    enterpriseId: string,
    input: CreateStockBatchBalanceInput,
    audit: EntityAuditContext,
  ) {
    const { productsEnterprisesId } = await this.assertRefs(
      enterpriseId,
      input,
    );
    try {
      const row = await db.transaction(async (tx) => {
        const [inserted] = await tx
          .insert(stockBatchBalances)
          .values({
            stockBatchId: input.stockBatchId,
            locationsId: input.locationsId,
            quantity: input.quantity.toString(),
          })
          .returning();
        if (!inserted) throw new Error("Falha ao criar saldo de lote");
        await applyProductStockBalanceDelta(
          tx,
          productsEnterprisesId,
          input.quantity,
        );
        return inserted;
      });
      await recordCreateAudit({
        entityType: EntityTypes.STOCK_BATCH_BALANCES,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return this.getById(enterpriseId, row.id);
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Saldo ja existe para lote e locacao",
          "STOCK_BATCH_BALANCE_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchStockBatchBalanceInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getPlainById(enterpriseId, id);
    const { productsEnterprisesId: oldPeId, ...existingRow } = existing;
    const { productsEnterprisesId } = await this.assertRefs(enterpriseId, {
      stockBatchId: input.stockBatchId ?? existing.stockBatchId,
      locationsId: input.locationsId ?? existing.locationsId,
    });
    const oldQty = Number(existing.quantity);
    const newQty =
      input.quantity !== undefined ? input.quantity : oldQty;
    try {
      const row = await db.transaction(async (tx) => {
        const [updated] = await tx
          .update(stockBatchBalances)
          .set({
            ...(input.stockBatchId !== undefined
              ? { stockBatchId: input.stockBatchId }
              : {}),
            ...(input.locationsId !== undefined
              ? { locationsId: input.locationsId }
              : {}),
            ...(input.quantity !== undefined
              ? { quantity: input.quantity.toString() }
              : {}),
            updatedAt: new Date(),
          })
          .where(eq(stockBatchBalances.id, id))
          .returning();
        if (!updated) {
          throw new NotFoundError(
            "Saldo de lote nao encontrado",
            "STOCK_BATCH_BALANCE_NOT_FOUND",
          );
        }
        if (oldPeId === productsEnterprisesId) {
          const delta = newQty - oldQty;
          if (delta !== 0) {
            await applyProductStockBalanceDelta(
              tx,
              productsEnterprisesId,
              delta,
            );
          }
        } else {
          if (oldQty !== 0) {
            await applyProductStockBalanceDelta(tx, oldPeId, -oldQty);
          }
          if (newQty !== 0) {
            await applyProductStockBalanceDelta(
              tx,
              productsEnterprisesId,
              newQty,
            );
          }
        }
        return updated;
      });
      await recordEntityAudit({
        entityType: EntityTypes.STOCK_BATCH_BALANCES,
        entityId: id,
        action: "UPDATE",
        before: toAuditRecord(existingRow),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return this.getById(enterpriseId, id);
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Saldo ja existe para lote e locacao",
          "STOCK_BATCH_BALANCE_CONFLICT",
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
    const row = await db.transaction(async (tx) => {
      const [deleted] = await tx
        .delete(stockBatchBalances)
        .where(eq(stockBatchBalances.id, id))
        .returning();
      if (!deleted) {
        throw new NotFoundError(
          "Saldo de lote nao encontrado",
          "STOCK_BATCH_BALANCE_NOT_FOUND",
        );
      }
      const qty = Number(existing.quantity);
      if (qty !== 0) {
        await applyProductStockBalanceDelta(
          tx,
          existing.productsEnterprisesId,
          -qty,
        );
      }
      return deleted;
    });
    await recordEntityAudit({
      entityType: EntityTypes.STOCK_BATCH_BALANCES,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const stockBatchBalancesService = new StockBatchBalancesService();
