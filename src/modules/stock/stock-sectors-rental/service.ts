import { and, asc, count, eq, inArray } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  productsEnterprises,
  stockLocations,
  stockSectorsRental,
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
  getProductEnterpriseForStock,
  assertStockLocationBelongsToEnterprise,
} from "../balance.js";
import type {
  CreateStockSectorRentalInput,
  ListStockSectorsRentalQuery,
  PatchStockSectorRentalInput,
} from "./schema.js";

type StockSectorRentalWithRelations = typeof stockSectorsRental.$inferSelect & {
  productsEnterprises: typeof productsEnterprises.$inferSelect;
  stockLocation: typeof stockLocations.$inferSelect;
};

export class StockSectorsRentalService {
  private toResponse(row: StockSectorRentalWithRelations) {
    const {
      productsEnterprisesId: _productsEnterprisesId,
      stockLocationId: _stockLocationId,
      productsEnterprises: productsEnterprisesRow,
      stockLocation: stockLocationRow,
      ...rest
    } = row;
    return {
      ...rest,
      productsEnterprises: productsEnterprisesRow,
      stockLocation: stockLocationRow,
    };
  }

  private enterpriseProductsEnterprisesIds(enterpriseId: string) {
    return db
      .select({ id: productsEnterprises.id })
      .from(productsEnterprises)
      .where(eq(productsEnterprises.enterprisesId, enterpriseId));
  }

  private scopeWhere(enterpriseId: string, id?: string) {
    const conditions = [
      inArray(
        stockSectorsRental.productsEnterprisesId,
        this.enterpriseProductsEnterprisesIds(enterpriseId),
      ),
    ];
    if (id) conditions.push(eq(stockSectorsRental.id, id));
    return and(...conditions);
  }

  private async assertRefs(
    enterpriseId: string,
    input: { productsEnterprisesId: string; stockLocationId: string },
  ) {
    const pe = await getProductEnterpriseForStock(
      enterpriseId,
      input.productsEnterprisesId,
    );
    if (pe.controlsBatch) {
      throw new ValidationError(
        [
          {
            path: "body.productsEnterprisesId",
            message:
              "Produto com lote deve usar saldos em /stock-batch-balances",
          },
        ],
        "Use saldo por lote",
      );
    }
    await assertStockLocationBelongsToEnterprise(
      enterpriseId,
      input.stockLocationId,
    );
  }

  private async getPlainById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select({
          id: stockSectorsRental.id,
          productsEnterprisesId: stockSectorsRental.productsEnterprisesId,
          stockLocationId: stockSectorsRental.stockLocationId,
          quantity: stockSectorsRental.quantity,
          createdAt: stockSectorsRental.createdAt,
          updatedAt: stockSectorsRental.updatedAt,
        })
        .from(stockSectorsRental)
        .innerJoin(
          productsEnterprises,
          eq(stockSectorsRental.productsEnterprisesId, productsEnterprises.id),
        )
        .where(
          and(
            eq(productsEnterprises.enterprisesId, enterpriseId),
            eq(stockSectorsRental.id, id),
          ),
        )
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Saldo de estoque nao encontrado",
        "STOCK_SECTOR_RENTAL_NOT_FOUND",
      );
    }
    return row;
  }

  public async list(
    enterpriseId: string,
    query: ListStockSectorsRentalQuery = {},
  ) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scopeWhere(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db.query.stockSectorsRental.findMany({
        where,
        with: {
          productsEnterprises: true,
          stockLocation: true,
        },
        orderBy: [asc(stockSectorsRental.id)],
        limit,
        offset,
      }),
      db.select({ c: count() }).from(stockSectorsRental).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return {
      items: items.map((row) => this.toResponse(row)),
      total,
      limit,
      offset,
    };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = await db.query.stockSectorsRental.findFirst({
      where: this.scopeWhere(enterpriseId, id),
      with: {
        productsEnterprises: true,
        stockLocation: true,
      },
    });
    if (!row) {
      throw new NotFoundError(
        "Saldo de estoque nao encontrado",
        "STOCK_SECTOR_RENTAL_NOT_FOUND",
      );
    }
    return this.toResponse(row);
  }

  public async create(
    enterpriseId: string,
    input: CreateStockSectorRentalInput,
    audit: EntityAuditContext,
  ) {
    await this.assertRefs(enterpriseId, input);
    try {
      const [row] = await db
        .insert(stockSectorsRental)
        .values({
          productsEnterprisesId: input.productsEnterprisesId,
          stockLocationId: input.stockLocationId,
          quantity: input.quantity.toString(),
        })
        .returning();
      if (!row) throw new Error("Falha ao criar saldo de estoque");
      await recordCreateAudit({
        entityType: EntityTypes.STOCK_SECTORS_RENTAL,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return this.getById(enterpriseId, row.id);
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Saldo ja existe para produto e locacao",
          "STOCK_SECTOR_RENTAL_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchStockSectorRentalInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getPlainById(enterpriseId, id);
    await this.assertRefs(enterpriseId, {
      productsEnterprisesId:
        input.productsEnterprisesId ?? existing.productsEnterprisesId,
      stockLocationId: input.stockLocationId ?? existing.stockLocationId,
    });
    try {
      const [row] = await db
        .update(stockSectorsRental)
        .set({
          ...(input.productsEnterprisesId !== undefined
            ? { productsEnterprisesId: input.productsEnterprisesId }
            : {}),
          ...(input.stockLocationId !== undefined
            ? { stockLocationId: input.stockLocationId }
            : {}),
          ...(input.quantity !== undefined
            ? { quantity: input.quantity.toString() }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(stockSectorsRental.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Saldo de estoque nao encontrado",
          "STOCK_SECTOR_RENTAL_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.STOCK_SECTORS_RENTAL,
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
          "Saldo ja existe para produto e locacao",
          "STOCK_SECTOR_RENTAL_CONFLICT",
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
      .delete(stockSectorsRental)
      .where(eq(stockSectorsRental.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Saldo de estoque nao encontrado",
        "STOCK_SECTOR_RENTAL_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.STOCK_SECTORS_RENTAL,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const stockSectorsRentalService = new StockSectorsRentalService();
