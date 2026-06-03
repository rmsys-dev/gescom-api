import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productsEnterprises, promotionalPrices } from "../../../db/schema.js";
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
  withEnterpriseAuditContext,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { getProductEnterpriseForStock } from "../../stock/balance.js";
import type {
  CreatePromotionalPriceInput,
  ListPromotionalPricesQuery,
  PatchPromotionalPriceInput,
} from "./schema.js";

export class PromotionalPricesService {
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(productsEnterprises.enterprisesId, enterpriseId)];
    if (id) base.push(eq(promotionalPrices.id, id));
    return and(...base);
  }

  public async list(
    enterpriseId: string,
    query: ListPromotionalPricesQuery = {},
  ) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scope(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: promotionalPrices.id,
          description: promotionalPrices.description,
          price: promotionalPrices.price,
          startDate: promotionalPrices.startDate,
          endDate: promotionalPrices.endDate,
          productsEnterprisesId: promotionalPrices.productsEnterprisesId,
          createdAt: promotionalPrices.createdAt,
          updatedAt: promotionalPrices.updatedAt,
        })
        .from(promotionalPrices)
        .innerJoin(
          productsEnterprises,
          eq(promotionalPrices.productsEnterprisesId, productsEnterprises.id),
        )
        .where(where)
        .orderBy(asc(promotionalPrices.startDate), asc(promotionalPrices.id))
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(promotionalPrices)
        .innerJoin(
          productsEnterprises,
          eq(promotionalPrices.productsEnterprisesId, productsEnterprises.id),
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
          id: promotionalPrices.id,
          description: promotionalPrices.description,
          price: promotionalPrices.price,
          startDate: promotionalPrices.startDate,
          endDate: promotionalPrices.endDate,
          productsEnterprisesId: promotionalPrices.productsEnterprisesId,
          createdAt: promotionalPrices.createdAt,
          updatedAt: promotionalPrices.updatedAt,
        })
        .from(promotionalPrices)
        .innerJoin(
          productsEnterprises,
          eq(promotionalPrices.productsEnterprisesId, productsEnterprises.id),
        )
        .where(this.scope(enterpriseId, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Preco promocional nao encontrado",
        "PROMOTIONAL_PRICE_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreatePromotionalPriceInput,
    audit: EntityAuditContext,
  ) {
    await getProductEnterpriseForStock(
      enterpriseId,
      input.productsEnterprisesId,
    );
    const ctx = withEnterpriseAuditContext(audit, enterpriseId);
    try {
      const [row] = await db
        .insert(promotionalPrices)
        .values({
          description: input.description?.trim() ?? null,
          price: input.price.toString(),
          startDate: input.startDate,
          endDate: input.endDate,
          productsEnterprisesId: input.productsEnterprisesId,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar preco promocional");
      await recordCreateAudit({
        entityType: EntityTypes.PROMOTIONAL_PRICES,
        entityId: row.id,
        after: row,
        ctx,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Preco promocional em conflito",
          "PROMOTIONAL_PRICE_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchPromotionalPriceInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    const ctx = withEnterpriseAuditContext(audit, enterpriseId);
    const startDate = input.startDate ?? existing.startDate;
    const endDate = input.endDate ?? existing.endDate;
    if (endDate < startDate) {
      throw new ValidationError(
        [{ path: "body.endDate", message: "endDate deve ser >= startDate" }],
        "endDate deve ser maior ou igual a startDate",
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
        .update(promotionalPrices)
        .set({
          ...(input.description !== undefined
            ? {
                description:
                  input.description === null ? null : input.description.trim(),
              }
            : {}),
          ...(input.price !== undefined
            ? { price: input.price.toString() }
            : {}),
          ...(input.startDate !== undefined
            ? { startDate: input.startDate }
            : {}),
          ...(input.endDate !== undefined ? { endDate: input.endDate } : {}),
          ...(input.productsEnterprisesId !== undefined
            ? { productsEnterprisesId: input.productsEnterprisesId }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(promotionalPrices.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Preco promocional nao encontrado",
          "PROMOTIONAL_PRICE_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PROMOTIONAL_PRICES,
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
          "Preco promocional em conflito",
          "PROMOTIONAL_PRICE_CONFLICT",
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
    const [row] = await db
      .delete(promotionalPrices)
      .where(eq(promotionalPrices.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Preco promocional nao encontrado",
        "PROMOTIONAL_PRICE_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.PROMOTIONAL_PRICES,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx,
    });
    return row;
  }
}

export const promotionalPricesService = new PromotionalPricesService();
