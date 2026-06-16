import { and, asc, count, eq } from "drizzle-orm";
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
import {
  assertEnterpriseCatalogDescriptionAvailable,
} from "../shared/enterprise-catalog-description.js";
import type {
  CreateProductGroupInput,
  ListProductGroupsQuery,
  PatchProductGroupInput,
} from "./schema.js";

export class ProductGroupsService {
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(productGroups.enterprisesId, enterpriseId)];
    if (id) base.push(eq(productGroups.id, id));
    return and(...base);
  }

  public async list(enterpriseId: string, query: ListProductGroupsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scope(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(productGroups)
        .where(where)
        .orderBy(asc(productGroups.description), asc(productGroups.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(productGroups).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select()
        .from(productGroups)
        .where(this.scope(enterpriseId, id))
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
    enterpriseId: string,
    input: CreateProductGroupInput,
    audit: EntityAuditContext,
  ) {
    const description = await assertEnterpriseCatalogDescriptionAvailable({
      table: productGroups,
      enterpriseId,
      description: input.description,
      conflictCode: "PRODUCT_GROUP_CONFLICT",
      message: "Descricao de grupo ja existe na empresa",
    });
    try {
      const [row] = await db
        .insert(productGroups)
        .values({
          enterprisesId: enterpriseId,
          description,
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
          "Descricao de grupo ja existe na empresa",
          "PRODUCT_GROUP_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchProductGroupInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    const description =
      input.description !== undefined
        ? await assertEnterpriseCatalogDescriptionAvailable({
            table: productGroups,
            enterpriseId,
            description: input.description,
            excludeId: id,
            conflictCode: "PRODUCT_GROUP_CONFLICT",
            message: "Descricao de grupo ja existe na empresa",
          })
        : undefined;
    try {
      const [row] = await db
        .update(productGroups)
        .set({
          ...(description !== undefined ? { description } : {}),
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
        .where(this.scope(enterpriseId, id))
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
          "Descricao de grupo ja existe na empresa",
          "PRODUCT_GROUP_CONFLICT",
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
      .delete(productGroups)
      .where(this.scope(enterpriseId, id))
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
