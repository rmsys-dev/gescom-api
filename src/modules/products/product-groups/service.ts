import { asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productGroups } from "../../../db/schema.js";
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
  CreateProductGroupInput,
  ListProductGroupsQuery,
  PatchProductGroupInput,
} from "./schema.js";

export class ProductGroupsService {
  public async list(query: ListProductGroupsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(productGroups)
        .orderBy(asc(productGroups.description), asc(productGroups.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(productGroups),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const row = (
      await db
        .select()
        .from(productGroups)
        .where(eq(productGroups.id, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Grupo de produto nao encontrado",
        "PRODUCT_GROUP_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    input: CreateProductGroupInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(productGroups)
        .values({
          description: input.description.trim(),
          profitMargin:
            input.profitMargin !== undefined
              ? input.profitMargin.toString()
              : null,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar grupo de produto");
      await recordCreateAudit({
        entityType: EntityTypes.PRODUCT_GROUPS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Grupo de produto em conflito",
          "PRODUCT_GROUP_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    id: string,
    input: PatchProductGroupInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(id);
    try {
      const [row] = await db
        .update(productGroups)
        .set({
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.profitMargin !== undefined
            ? {
                profitMargin:
                  input.profitMargin === null
                    ? null
                    : input.profitMargin.toString(),
              }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(productGroups.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Grupo de produto nao encontrado",
          "PRODUCT_GROUP_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCT_GROUPS,
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
          "Grupo de produto em conflito",
          "PRODUCT_GROUP_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(id: string, audit: EntityAuditContext) {
    const existing = await this.getById(id);
    const [row] = await db
      .delete(productGroups)
      .where(eq(productGroups.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Grupo de produto nao encontrado",
        "PRODUCT_GROUP_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.PRODUCT_GROUPS,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const productGroupsService = new ProductGroupsService();
