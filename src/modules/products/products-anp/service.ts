import { and, asc, count, eq, isNull } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productsAnp } from "../../../db/schema.js";
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
  CreateProductsAnpInput,
  ListProductsAnpQuery,
  PatchProductsAnpInput,
} from "./schema.js";

export class ProductsAnpService {
  public async list(query: ListProductsAnpQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(productsAnp)
        .orderBy(asc(productsAnp.anp), asc(productsAnp.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(productsAnp),
    ]);

    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const rows = await db
      .select()
      .from(productsAnp)
      .where(eq(productsAnp.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundError(
        "ANP de produto nao encontrado",
        "PRODUCTS_ANP_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    input: CreateProductsAnpInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(productsAnp)
        .values({
          anp: input.anp,
          description: input.description.trim(),
        })
        .returning();
      if (!row) {
        throw new Error("Falha ao criar ANP de produto");
      }
      await recordCreateAudit({
        entityType: EntityTypes.PRODUCTS_ANP,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "ANP de produto em conflito (cest duplicado)",
          "PRODUCTS_CEST_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    productsAnpId: string,
    input: PatchProductsAnpInput,
    audit: EntityAuditContext,
  ) {
    const rows = await db
      .select()
      .from(productsAnp)
      .where(and(eq(productsAnp.id, productsAnpId)));
    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError(
        "ANP de produto nao encontrado",
        "PRODUCTS_ANP_NOT_FOUND",
      );
    }

    const now = new Date();

    try {
      const [row] = await db
        .update(productsAnp)
        .set({
          ...(input.anp !== undefined ? { anp: input.anp } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          updatedAt: now,
        })
        .where(eq(productsAnp.id, productsAnpId))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "ANP de produto nao encontrado",
          "PRODUCTS_CEST_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCTS_ANP,
        entityId: productsAnpId,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "ANP de produto em conflito (cest duplicado)",
          "PRODUCTS_CEST_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(productsAnpId: string, audit: EntityAuditContext) {
    const existing = await this.getById(productsAnpId);
    const [row] = await db
      .delete(productsAnp)
      .where(eq(productsAnp.id, productsAnpId))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "ANP de produto nao encontrado",
        "PRODUCTS_ANP_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.PRODUCTS_ANP,
      entityId: productsAnpId,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const productsAnpService = new ProductsAnpService();
