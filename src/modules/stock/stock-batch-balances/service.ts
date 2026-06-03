import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  productsEnterprises,
  stockBatchBalances,
  stockBatches,
  stockLocations,
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
  assertBatchBelongsToProduct,
  getProductEnterpriseForStock,
} from "../balance.js";
import type {
  CreateStockBatchBalanceInput,
  ListStockBatchBalancesQuery,
  PatchStockBatchBalanceInput,
} from "./schema.js";

export class StockBatchBalancesService {
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(productsEnterprises.enterprisesId, enterpriseId)];
    if (id) base.push(eq(stockBatchBalances.id, id));
    return and(...base);
  }

  private async assertRefs(
    enterpriseId: string,
    input: { stockBatchId: string; stockLocationId: string },
  ) {
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
    const location = (
      await db
        .select({ id: stockLocations.id })
        .from(stockLocations)
        .where(eq(stockLocations.id, input.stockLocationId))
        .limit(1)
    )[0];
    if (!location) {
      throw new NotFoundError(
        "Locacao fisica de estoque nao encontrada",
        "STOCK_LOCATION_NOT_FOUND",
      );
    }
  }

  public async list(
    enterpriseId: string,
    query: ListStockBatchBalancesQuery = {},
  ) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scope(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: stockBatchBalances.id,
          stockBatchId: stockBatchBalances.stockBatchId,
          stockLocationId: stockBatchBalances.stockLocationId,
          quantity: stockBatchBalances.quantity,
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
        .where(where)
        .orderBy(asc(stockBatchBalances.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(stockBatchBalances)
        .innerJoin(
          stockBatches,
          eq(stockBatchBalances.stockBatchId, stockBatches.id),
        )
        .innerJoin(
          productsEnterprises,
          eq(stockBatches.productsEnterprisesId, productsEnterprises.id),
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
          id: stockBatchBalances.id,
          stockBatchId: stockBatchBalances.stockBatchId,
          stockLocationId: stockBatchBalances.stockLocationId,
          quantity: stockBatchBalances.quantity,
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
        .where(this.scope(enterpriseId, id))
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

  public async create(
    enterpriseId: string,
    input: CreateStockBatchBalanceInput,
    audit: EntityAuditContext,
  ) {
    await this.assertRefs(enterpriseId, input);
    try {
      const [row] = await db
        .insert(stockBatchBalances)
        .values({
          stockBatchId: input.stockBatchId,
          stockLocationId: input.stockLocationId,
          quantity: input.quantity.toString(),
        })
        .returning();
      if (!row) throw new Error("Falha ao criar saldo de lote");
      await recordCreateAudit({
        entityType: EntityTypes.STOCK_BATCH_BALANCES,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
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
    const existing = await this.getById(enterpriseId, id);
    await this.assertRefs(enterpriseId, {
      stockBatchId: input.stockBatchId ?? existing.stockBatchId,
      stockLocationId: input.stockLocationId ?? existing.stockLocationId,
    });
    try {
      const [row] = await db
        .update(stockBatchBalances)
        .set({
          ...(input.stockBatchId !== undefined
            ? { stockBatchId: input.stockBatchId }
            : {}),
          ...(input.stockLocationId !== undefined
            ? { stockLocationId: input.stockLocationId }
            : {}),
          ...(input.quantity !== undefined
            ? { quantity: input.quantity.toString() }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(stockBatchBalances.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Saldo de lote nao encontrado",
          "STOCK_BATCH_BALANCE_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.STOCK_BATCH_BALANCES,
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
    const existing = await this.getById(enterpriseId, id);
    const [row] = await db
      .delete(stockBatchBalances)
      .where(eq(stockBatchBalances.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Saldo de lote nao encontrado",
        "STOCK_BATCH_BALANCE_NOT_FOUND",
      );
    }
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
