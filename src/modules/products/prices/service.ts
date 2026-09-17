import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { prices, productsEnterprises } from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  withEnterpriseAuditContext,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { getProductEnterpriseForStock } from "../../stock/balance.js";
import type {
  CreatePriceInput,
  ListPricesQuery,
  PatchPriceInput,
} from "./schema.js";

export class PricesService {
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(productsEnterprises.enterprisesId, enterpriseId)];
    if (id) base.push(eq(prices.id, id));
    return and(...base);
  }

  public async list(enterpriseId: string, query: ListPricesQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scope(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: prices.id,
          price: prices.price,
          averageCost: prices.averageCost,
          actualRealCost: prices.actualRealCost,
          previousCost: prices.previousCost,
          priceCost: prices.priceCost,
          productsEnterprisesId: prices.productsEnterprisesId,
          createdAt: prices.createdAt,
          updatedAt: prices.updatedAt,
        })
        .from(prices)
        .innerJoin(
          productsEnterprises,
          eq(prices.productsEnterprisesId, productsEnterprises.id),
        )
        .where(where)
        .orderBy(asc(prices.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(prices)
        .innerJoin(
          productsEnterprises,
          eq(prices.productsEnterprisesId, productsEnterprises.id),
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
          id: prices.id,
          price: prices.price,
          averageCost: prices.averageCost,
          actualRealCost: prices.actualRealCost,
          previousCost: prices.previousCost,
          priceCost: prices.priceCost,
          productsEnterprisesId: prices.productsEnterprisesId,
          createdAt: prices.createdAt,
          updatedAt: prices.updatedAt,
        })
        .from(prices)
        .innerJoin(
          productsEnterprises,
          eq(prices.productsEnterprisesId, productsEnterprises.id),
        )
        .where(this.scope(enterpriseId, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError("Preco nao encontrado", "PRICE_NOT_FOUND");
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreatePriceInput,
    audit: EntityAuditContext,
  ) {
    await getProductEnterpriseForStock(
      enterpriseId,
      input.productsEnterprisesId,
    );
    const ctx = withEnterpriseAuditContext(audit, enterpriseId);
    try {
      const [row] = await db
        .insert(prices)
        .values({
          price: input.price.toString(),
          averageCost:
            input.averageCost !== undefined
              ? input.averageCost.toString()
              : null,
          actualRealCost:
            input.actualRealCost !== undefined
              ? input.actualRealCost.toString()
              : null,
          previousCost:
            input.previousCost !== undefined
              ? input.previousCost.toString()
              : null,
          priceCost:
            input.priceCost !== undefined ? input.priceCost.toString() : null,
          productsEnterprisesId: input.productsEnterprisesId,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar preco");
      await recordCreateAudit({
        entityType: EntityTypes.PRODUCT_PRICES,
        entityId: row.id,
        after: row,
        ctx,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Preco ja existe para este produto/empresa",
          "PRICE_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchPriceInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    const ctx = withEnterpriseAuditContext(audit, enterpriseId);
    if (input.productsEnterprisesId) {
      await getProductEnterpriseForStock(
        enterpriseId,
        input.productsEnterprisesId,
      );
    }
    try {
      const [row] = await db
        .update(prices)
        .set({
          ...(input.price !== undefined
            ? { price: input.price.toString() }
            : {}),
          ...(input.averageCost !== undefined
            ? {
                averageCost:
                  input.averageCost === null
                    ? null
                    : input.averageCost.toString(),
              }
            : {}),
          ...(input.actualRealCost !== undefined
            ? {
                actualRealCost:
                  input.actualRealCost === null
                    ? null
                    : input.actualRealCost.toString(),
              }
            : {}),
          ...(input.previousCost !== undefined
            ? {
                previousCost:
                  input.previousCost === null
                    ? null
                    : input.previousCost.toString(),
              }
            : {}),
          ...(input.priceCost !== undefined
            ? {
                priceCost:
                  input.priceCost === null ? null : input.priceCost.toString(),
              }
            : {}),
          ...(input.productsEnterprisesId !== undefined
            ? { productsEnterprisesId: input.productsEnterprisesId }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(prices.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError("Preco nao encontrado", "PRICE_NOT_FOUND");
      }
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCT_PRICES,
        entityId: id,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Preco ja existe para este produto/empresa",
          "PRICE_CONFLICT",
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
    const ctx = withEnterpriseAuditContext(audit, enterpriseId);
    const [row] = await db.delete(prices).where(eq(prices.id, id)).returning();
    if (!row) {
      throw new NotFoundError("Preco nao encontrado", "PRICE_NOT_FOUND");
    }
    await recordEntityAudit({
      entityType: EntityTypes.PRODUCT_PRICES,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx,
    });
    return row;
  }
}

export const pricesService = new PricesService();
