import { and, asc, count, desc, eq, gte, inArray, lte } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  productsEnterprises,
  stockMovements,
  stockSectors,
  users,
} from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { assertStockLocationBelongsToEnterprise } from "../balance.js";
import { createStockMovementInTx } from "../movement.js";
import {
  stockBatchDetailWith,
  stockLocationDetailWith,
  toStockBatchResponse,
  toStockLocationResponse,
  type StockBatchWithProductEnterprise,
  type StockLocationWithSector,
} from "../nested-response.js";
import type {
  CreateStockMovementInput,
  ListStockMovementsQuery,
} from "./schema.js";

type StockMovementWithRelations = typeof stockMovements.$inferSelect & {
  productsEnterprises: typeof productsEnterprises.$inferSelect;
  fromStockSector: typeof stockSectors.$inferSelect | null;
  toStockSector: typeof stockSectors.$inferSelect | null;
  fromStockLocation: StockLocationWithSector | null;
  toStockLocation: StockLocationWithSector | null;
  fromStockBatch: StockBatchWithProductEnterprise | null;
  toStockBatch: StockBatchWithProductEnterprise | null;
  user: typeof users.$inferSelect | null;
};

const movementDetailWith = {
  productsEnterprises: true,
  fromStockSector: true,
  toStockSector: true,
  fromStockLocation: {
    with: stockLocationDetailWith,
  },
  toStockLocation: {
    with: stockLocationDetailWith,
  },
  fromStockBatch: {
    with: stockBatchDetailWith,
  },
  toStockBatch: {
    with: stockBatchDetailWith,
  },
  user: true,
} as const;

export class StockMovementsService {
  private toResponse(row: StockMovementWithRelations) {
    const {
      productsEnterprisesId: _productsEnterprisesId,
      fromStockSectorId: _fromStockSectorId,
      fromStockLocationId: _fromStockLocationId,
      fromStockBatchId: _fromStockBatchId,
      toStockSectorId: _toStockSectorId,
      toStockLocationId: _toStockLocationId,
      toStockBatchId: _toStockBatchId,
      userId: _userId,
      productsEnterprises: productsEnterprisesRow,
      fromStockSector,
      toStockSector,
      fromStockLocation,
      toStockLocation,
      fromStockBatch,
      toStockBatch,
      user,
      ...rest
    } = row;
    return {
      ...rest,
      productsEnterprises: productsEnterprisesRow,
      fromStockSector: fromStockSector ?? null,
      toStockSector: toStockSector ?? null,
      fromStockLocation: fromStockLocation
        ? toStockLocationResponse(fromStockLocation)
        : null,
      toStockLocation: toStockLocation
        ? toStockLocationResponse(toStockLocation)
        : null,
      fromStockBatch: fromStockBatch
        ? toStockBatchResponse(fromStockBatch)
        : null,
      toStockBatch: toStockBatch ? toStockBatchResponse(toStockBatch) : null,
      user: user ?? null,
    };
  }

  private enterpriseProductsEnterprisesIds(enterpriseId: string) {
    return db
      .select({ id: productsEnterprises.id })
      .from(productsEnterprises)
      .where(eq(productsEnterprises.enterprisesId, enterpriseId));
  }

  private scopeWhere(
    enterpriseId: string,
    id?: string,
    query: ListStockMovementsQuery = {},
  ) {
    const conditions = [
      inArray(
        stockMovements.productsEnterprisesId,
        this.enterpriseProductsEnterprisesIds(enterpriseId),
      ),
    ];
    if (id) conditions.push(eq(stockMovements.id, id));
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
    return and(...conditions);
  }

  public async list(
    enterpriseId: string,
    query: ListStockMovementsQuery = {},
  ) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scopeWhere(enterpriseId, undefined, query);
    const [items, totalRows] = await Promise.all([
      db.query.stockMovements.findMany({
        where,
        with: movementDetailWith,
        orderBy: [desc(stockMovements.createdAt), asc(stockMovements.id)],
        limit,
        offset,
      }),
      db.select({ c: count() }).from(stockMovements).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return {
      items: items.map((row) =>
        this.toResponse(row as StockMovementWithRelations),
      ),
      total,
      limit,
      offset,
    };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = await db.query.stockMovements.findFirst({
      where: this.scopeWhere(enterpriseId, id),
      with: movementDetailWith,
    });
    if (!row) {
      throw new NotFoundError(
        "Movimento de estoque nao encontrado",
        "STOCK_MOVEMENT_NOT_FOUND",
      );
    }
    return this.toResponse(row as StockMovementWithRelations);
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

    return this.getById(enterpriseId, row.id);
  }
}

export const stockMovementsService = new StockMovementsService();
