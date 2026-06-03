import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productsEnterprises, stockMinMax } from "../../../db/schema.js";
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
import { getProductEnterpriseForStock } from "../balance.js";
import type {
  CreateStockMinMaxInput,
  ListStockMinMaxQuery,
  PatchStockMinMaxInput,
} from "./schema.js";

export class StockMinMaxService {
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(productsEnterprises.enterprisesId, enterpriseId)];
    if (id) base.push(eq(stockMinMax.id, id));
    return and(...base);
  }

  public async list(enterpriseId: string, query: ListStockMinMaxQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scope(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: stockMinMax.id,
          quantityMin: stockMinMax.quantityMin,
          quantityMax: stockMinMax.quantityMax,
          productsEnterprisesId: stockMinMax.productsEnterprisesId,
          createdAt: stockMinMax.createdAt,
          updatedAt: stockMinMax.updatedAt,
        })
        .from(stockMinMax)
        .innerJoin(
          productsEnterprises,
          eq(stockMinMax.productsEnterprisesId, productsEnterprises.id),
        )
        .where(where)
        .orderBy(asc(stockMinMax.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(stockMinMax)
        .innerJoin(
          productsEnterprises,
          eq(stockMinMax.productsEnterprisesId, productsEnterprises.id),
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
          id: stockMinMax.id,
          quantityMin: stockMinMax.quantityMin,
          quantityMax: stockMinMax.quantityMax,
          productsEnterprisesId: stockMinMax.productsEnterprisesId,
          createdAt: stockMinMax.createdAt,
          updatedAt: stockMinMax.updatedAt,
        })
        .from(stockMinMax)
        .innerJoin(
          productsEnterprises,
          eq(stockMinMax.productsEnterprisesId, productsEnterprises.id),
        )
        .where(this.scope(enterpriseId, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Estoque min/max nao encontrado",
        "STOCK_MIN_MAX_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreateStockMinMaxInput,
    audit: EntityAuditContext,
  ) {
    await getProductEnterpriseForStock(
      enterpriseId,
      input.productsEnterprisesId,
    );
    try {
      const [row] = await db
        .insert(stockMinMax)
        .values({
          quantityMin: input.quantityMin.toString(),
          quantityMax: input.quantityMax.toString(),
          productsEnterprisesId: input.productsEnterprisesId,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar estoque min/max");
      await recordCreateAudit({
        entityType: EntityTypes.STOCK_MIN_MAX,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Estoque min/max ja existe para produto/empresa",
          "STOCK_MIN_MAX_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchStockMinMaxInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    const min =
      input.quantityMin !== undefined
        ? input.quantityMin
        : Number(existing.quantityMin);
    const max =
      input.quantityMax !== undefined
        ? input.quantityMax
        : Number(existing.quantityMax);
    if (max < min) {
      throw new ValidationError(
        [
          {
            path: "body.quantityMax",
            message: "quantityMax deve ser >= quantityMin",
          },
        ],
        "quantityMax invalido",
      );
    }
    if (input.productsEnterprisesId) {
      await getProductEnterpriseForStock(
        enterpriseId,
        input.productsEnterprisesId,
      );
    }
    try {
      const [row] = await db
        .update(stockMinMax)
        .set({
          ...(input.quantityMin !== undefined
            ? { quantityMin: input.quantityMin.toString() }
            : {}),
          ...(input.quantityMax !== undefined
            ? { quantityMax: input.quantityMax.toString() }
            : {}),
          ...(input.productsEnterprisesId !== undefined
            ? { productsEnterprisesId: input.productsEnterprisesId }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(stockMinMax.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Estoque min/max nao encontrado",
          "STOCK_MIN_MAX_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.STOCK_MIN_MAX,
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
          "Estoque min/max ja existe para produto/empresa",
          "STOCK_MIN_MAX_CONFLICT",
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
      .delete(stockMinMax)
      .where(eq(stockMinMax.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Estoque min/max nao encontrado",
        "STOCK_MIN_MAX_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.STOCK_MIN_MAX,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const stockMinMaxService = new StockMinMaxService();
