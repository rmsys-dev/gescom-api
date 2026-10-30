import { and, asc, count, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  productsEnterprises,
  stockMovements,
  sectors,
  users,
} from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { assertLocationBelongsToEnterprise } from "../balance.js";
import { createStockMovementInTx } from "../movement.js";
import {
  stockBatchDetailWith,
  locationDetailWith,
  toStockBatchResponse,
  toLocationResponse,
  type StockBatchWithProductEnterprise,
  type LocationWithSector,
} from "../nested-response.js";
import type {
  CreateStockMovementInput,
  ListStockMovementsQuery,
} from "./schema.js";

type StockMovementWithRelations = typeof stockMovements.$inferSelect & {
  productsEnterprises: typeof productsEnterprises.$inferSelect;
  fromSector: typeof sectors.$inferSelect | null;
  toSector: typeof sectors.$inferSelect | null;
  fromLocation: LocationWithSector | null;
  toLocation: LocationWithSector | null;
  fromStockBatch: StockBatchWithProductEnterprise | null;
  toStockBatch: StockBatchWithProductEnterprise | null;
  user: typeof users.$inferSelect | null;
};

const movementDetailWith = {
  productsEnterprises: true,
  fromSector: true,
  toSector: true,
  fromLocation: {
    with: locationDetailWith,
  },
  toLocation: {
    with: locationDetailWith,
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
      fromSectorId: _fromSectorId,
      fromLocationsId: _fromLocationsId,
      fromStockBatchId: _fromStockBatchId,
      toSectorId: _toSectorId,
      toLocationsId: _toLocationsId,
      toStockBatchId: _toStockBatchId,
      userId: _userId,
      productsEnterprises: productsEnterprisesRow,
      fromSector,
      toSector,
      fromLocation,
      toLocation,
      fromStockBatch,
      toStockBatch,
      user,
      ...rest
    } = row;
    return {
      ...rest,
      productsEnterprises: productsEnterprisesRow,
      fromSector: fromSector ?? null,
      toSector: toSector ?? null,
      fromLocation: fromLocation
        ? toLocationResponse(fromLocation)
        : null,
      toLocation: toLocation
        ? toLocationResponse(toLocation)
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

  /** Quantidades de todos os movimentos do filtro da listagem, sem paginação. */
  public async summary(
    enterpriseId: string,
    query: ListStockMovementsQuery = {},
  ) {
    const where = this.scopeWhere(enterpriseId, undefined, query);
    const ofType = (type: string) =>
      sql<string>`coalesce(sum(case when ${stockMovements.type} = ${type} then ${stockMovements.quantity} else 0 end), 0)`;
    const [row] = await db
      .select({
        count: count(),
        quantity: sql<string>`coalesce(sum(${stockMovements.quantity}), 0)`,
        entrada: ofType("ENTRADA"),
        saida: ofType("SAIDA"),
        transferencia: ofType("TRANSFERENCIA"),
        ajuste: ofType("AJUSTE"),
        perda: ofType("PERDA"),
        venda: ofType("VENDA"),
        compra: ofType("COMPRA"),
        devolucao: ofType("DEVOLUCAO"),
        cancelamento: ofType("CANCELAMENTO"),
        outros: ofType("OUTROS"),
      })
      .from(stockMovements)
      .where(where);
    const qty = (value: unknown) => {
      const number = Number(value ?? 0);
      return Number.isFinite(number) ? Math.round(number * 10000) / 10000 : 0;
    };
    return {
      count: Number(row?.count ?? 0),
      quantity: qty(row?.quantity),
      entrada: qty(row?.entrada),
      saida: qty(row?.saida),
      transferencia: qty(row?.transferencia),
      ajuste: qty(row?.ajuste),
      perda: qty(row?.perda),
      venda: qty(row?.venda),
      compra: qty(row?.compra),
      devolucao: qty(row?.devolucao),
      cancelamento: qty(row?.cancelamento),
      outros: qty(row?.outros),
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
    if (input.fromLocationsId) {
      await assertLocationBelongsToEnterprise(
        enterpriseId,
        input.fromLocationsId,
      );
    }
    if (input.toLocationsId) {
      await assertLocationBelongsToEnterprise(
        enterpriseId,
        input.toLocationsId,
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
          fromLocationsId: input.fromLocationsId,
          fromStockBatchId: input.fromStockBatchId,
          toLocationsId: input.toLocationsId,
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
