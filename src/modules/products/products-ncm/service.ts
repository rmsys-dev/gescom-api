import { asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productsNcm } from "../../../db/schema.js";
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
  CreateProductsNcmInput,
  ListProductsNcmQuery,
  PatchProductsNcmInput,
} from "./schema.js";

export class ProductsNcmService {
  public async list(query: ListProductsNcmQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(productsNcm)
        .orderBy(asc(productsNcm.description), asc(productsNcm.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(productsNcm),
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const rows = await db
      .select()
      .from(productsNcm)
      .where(eq(productsNcm.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundError(
        "NCM de produto nao encontrado",
        "PRODUCTS_NCM_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    input: CreateProductsNcmInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(productsNcm)
        .values({
          ncm: input.ncm,
          description: input.description.trim(),
        })
        .returning();
      if (!row) {
        throw new Error("Falha ao criar NCM de produto");
      }
      await recordCreateAudit({
        entityType: EntityTypes.PRODUCTS_NCM,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "NCM de produto em conflito (ncm duplicado)",
          "PRODUCTS_NCM_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    productsNcmId: string,
    input: PatchProductsNcmInput,
    audit: EntityAuditContext,
  ) {
    const rows = await db
      .select()
      .from(productsNcm)
      .where(eq(productsNcm.id, productsNcmId))
      .limit(1);
    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError(
        "NCM de produto nao encontrado",
        "PRODUCTS_NCM_NOT_FOUND",
      );
    }

    const now = new Date();

    try {
      const [row] = await db
        .update(productsNcm)
        .set({
          ...(input.ncm !== undefined ? { ncm: input.ncm } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          updatedAt: now,
        })
        .where(eq(productsNcm.id, productsNcmId))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "NCM de produto nao encontrado",
          "PRODUCTS_NCM_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCTS_NCM,
        entityId: productsNcmId,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "NCM de produto em conflito (ncm duplicado)",
          "PRODUCTS_NCM_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(productsNcmId: string, audit: EntityAuditContext) {
    const existing = await this.getById(productsNcmId);
    const [row] = await db
      .delete(productsNcm)
      .where(eq(productsNcm.id, productsNcmId))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "NCM de produto nao encontrado",
        "PRODUCTS_NCM_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.PRODUCTS_NCM,
      entityId: productsNcmId,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const productsNcmService = new ProductsNcmService();
