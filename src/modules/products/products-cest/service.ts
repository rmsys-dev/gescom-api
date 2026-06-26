import { and, asc, count, eq, ilike } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productsCest } from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
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
import type {
  CreateProductsCestInput,
  ListProductsCestQuery,
  PatchProductsCestInput,
} from "./schema.js";
import { fiscalCodeIlikeCondition } from "../shared/fiscal-code-filter.js";

export class ProductsCestService {
  public async list(query: ListProductsCestQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [];
    if (query.description) {
      conditions.push(
        ilike(productsCest.description, `%${query.description.toUpperCase()}%`),
      );
    }
    if (query.cest) {
      conditions.push(fiscalCodeIlikeCondition(productsCest.cest, query.cest));
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(productsCest)
        .where(where)
        .orderBy(asc(productsCest.cest), asc(productsCest.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(productsCest).where(where),
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const rows = await db
      .select()
      .from(productsCest)
      .where(eq(productsCest.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundError(
        "CEST de produto nao encontrado",
        "PRODUCTS_CEST_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    input: CreateProductsCestInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(productsCest)
        .values({
          cest: input.cest,
          description: input.description.trim(),
          productsNcmId: input.productsNcmId, //TODO: verificar se o ncm existe
        })
        .returning();
      if (!row) {
        throw new Error("Falha ao criar CEST de produto");
      }
      await recordCreateAudit({
        entityType: EntityTypes.PRODUCTS_CEST,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "CEST de produto em conflito (cest duplicado)",
          "PRODUCTS_CEST_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    productsCestId: string,
    input: PatchProductsCestInput,
    audit: EntityAuditContext,
  ) {
    const rows = await db
      .select()
      .from(productsCest)
      .where(eq(productsCest.id, productsCestId));
    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError(
        "CEST de produto nao encontrado",
        "PRODUCTS_CEST_NOT_FOUND",
      );
    }

    const now = new Date();

    try {
      const [row] = await db
        .update(productsCest)
        .set({
          ...(input.cest !== undefined ? { cest: input.cest } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.productsNcmId !== undefined
            ? { productsNcmId: input.productsNcmId }
            : {}),
          updatedAt: now,
        })
        .where(
          and(
            eq(productsCest.id, productsCestId),
            ...(input.productsNcmId
              ? [eq(productsCest.productsNcmId, input.productsNcmId)]
              : []),
          ),
        )
        .returning();
      if (!row) {
        throw new NotFoundError(
          "CEST de produto nao encontrado",
          "PRODUCTS_CEST_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCTS_CEST,
        entityId: productsCestId,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "CEST de produto em conflito (cest duplicado)",
          "PRODUCTS_CEST_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(productsCestId: string, audit: EntityAuditContext) {
    const existing = await this.getById(productsCestId);
    const [row] = await db
      .delete(productsCest)
      .where(eq(productsCest.id, productsCestId))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "CEST de produto nao encontrado",
        "PRODUCTS_CEST_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.PRODUCTS_CEST,
      entityId: productsCestId,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const productsCestService = new ProductsCestService();
