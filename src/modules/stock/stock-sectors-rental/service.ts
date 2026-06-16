import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  productsEnterprises,
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
import { getProductEnterpriseForStock, assertStockLocationBelongsToEnterprise } from "../balance.js";
import type {
  CreateStockSectorRentalInput,
  ListStockSectorsRentalQuery,
  PatchStockSectorRentalInput,
} from "./schema.js";

export class StockSectorsRentalService {
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(productsEnterprises.enterprisesId, enterpriseId)];
    if (id) base.push(eq(stockSectorsRental.id, id));
    return and(...base);
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

  public async list(
    enterpriseId: string,
    query: ListStockSectorsRentalQuery = {},
  ) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scope(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db
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
        .where(where)
        .orderBy(asc(stockSectorsRental.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(stockSectorsRental)
        .innerJoin(
          productsEnterprises,
          eq(stockSectorsRental.productsEnterprisesId, productsEnterprises.id),
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
        .where(this.scope(enterpriseId, id))
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
      return row;
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
    const existing = await this.getById(enterpriseId, id);
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
      return row;
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
    const existing = await this.getById(enterpriseId, id);
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
