import { and, asc, count, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productsEnterprises, stockMovements } from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { assertStockLocationBelongsToEnterprise } from "../balance.js";
import { createStockMovementInTx } from "../movement.js";
import type {
  CreateStockMovementInput,
  ListStockMovementsQuery,
} from "./schema.js";

export class StockMovementsService {
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(productsEnterprises.enterprisesId, enterpriseId)];
    if (id) base.push(eq(stockMovements.id, id));
    return and(...base);
  }

  public async list(
    enterpriseId: string,
    query: ListStockMovementsQuery = {},
  ) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [eq(productsEnterprises.enterprisesId, enterpriseId)];
    if (query.productsEnterprisesId) {
      conditions.push(
        eq(stockMovements.productsEnterprisesId, query.productsEnterprisesId),
      );
    }
    if (query.type) {
      conditions.push(eq(stockMovements.type, query.type));
    }
    if (query.dateFrom) {
      conditions.push(gte(stockMovements.createdAt, query.dateFrom));
    }
    if (query.dateTo) {
      conditions.push(lte(stockMovements.createdAt, query.dateTo));
    }
    const where = and(...conditions);
    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: stockMovements.id,
          transferGroupId: stockMovements.transferGroupId,
          type: stockMovements.type,
          productsEnterprisesId: stockMovements.productsEnterprisesId,
          fromStockSectorId: stockMovements.fromStockSectorId,
          fromStockLocationId: stockMovements.fromStockLocationId,
          fromStockBatchId: stockMovements.fromStockBatchId,
          toStockSectorId: stockMovements.toStockSectorId,
          toStockLocationId: stockMovements.toStockLocationId,
          toStockBatchId: stockMovements.toStockBatchId,
          quantity: stockMovements.quantity,
          fromQuantityBefore: stockMovements.fromQuantityBefore,
          fromQuantityAfter: stockMovements.fromQuantityAfter,
          toQuantityBefore: stockMovements.toQuantityBefore,
          toQuantityAfter: stockMovements.toQuantityAfter,
          userId: stockMovements.userId,
          notes: stockMovements.notes,
          documentRef: stockMovements.documentRef,
          createdAt: stockMovements.createdAt,
        })
        .from(stockMovements)
        .innerJoin(
          productsEnterprises,
          eq(stockMovements.productsEnterprisesId, productsEnterprises.id),
        )
        .where(where)
        .orderBy(desc(stockMovements.createdAt), asc(stockMovements.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(stockMovements)
        .innerJoin(
          productsEnterprises,
          eq(stockMovements.productsEnterprisesId, productsEnterprises.id),
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
          id: stockMovements.id,
          transferGroupId: stockMovements.transferGroupId,
          type: stockMovements.type,
          productsEnterprisesId: stockMovements.productsEnterprisesId,
          fromStockSectorId: stockMovements.fromStockSectorId,
          fromStockLocationId: stockMovements.fromStockLocationId,
          fromStockBatchId: stockMovements.fromStockBatchId,
          toStockSectorId: stockMovements.toStockSectorId,
          toStockLocationId: stockMovements.toStockLocationId,
          toStockBatchId: stockMovements.toStockBatchId,
          quantity: stockMovements.quantity,
          fromQuantityBefore: stockMovements.fromQuantityBefore,
          fromQuantityAfter: stockMovements.fromQuantityAfter,
          toQuantityBefore: stockMovements.toQuantityBefore,
          toQuantityAfter: stockMovements.toQuantityAfter,
          userId: stockMovements.userId,
          notes: stockMovements.notes,
          documentRef: stockMovements.documentRef,
          createdAt: stockMovements.createdAt,
        })
        .from(stockMovements)
        .innerJoin(
          productsEnterprises,
          eq(stockMovements.productsEnterprisesId, productsEnterprises.id),
        )
        .where(this.scope(enterpriseId, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Movimento de estoque nao encontrado",
        "STOCK_MOVEMENT_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    userId: string | null,
    input: CreateStockMovementInput,
    audit: EntityAuditContext,
  ) {
    if (input.fromStockLocationId) {
      await assertStockLocationBelongsToEnterprise(
        enterpriseId,
        input.fromStockLocationId,
      );
    }
    if (input.toStockLocationId) {
      await assertStockLocationBelongsToEnterprise(
        enterpriseId,
        input.toStockLocationId,
      );
    }

    const row = await db.transaction(async (tx) =>
      createStockMovementInTx(tx, {
        enterpriseId,
        userId,
        input: {
          type: input.type,
          productsEnterprisesId: input.productsEnterprisesId,
          quantity: input.quantity,
          fromStockLocationId: input.fromStockLocationId,
          fromStockBatchId: input.fromStockBatchId,
          toStockLocationId: input.toStockLocationId,
          toStockBatchId: input.toStockBatchId,
          notes: input.notes,
          documentRef: input.documentRef,
          transferGroupId: input.transferGroupId,
        },
      }),
    );

    await recordCreateAudit({
      entityType: EntityTypes.STOCK_MOVEMENTS,
      entityId: row.id,
      after: row,
      ctx: audit,
    });

    return row;
  }
}

export const stockMovementsService = new StockMovementsService();
