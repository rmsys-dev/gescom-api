import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productBrands } from "../../../db/schema.js";
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
  CreateProductBrandInput,
  ListProductBrandsQuery,
  PatchProductBrandInput,
} from "./schema.js";

export class ProductBrandsService {
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(productBrands.enterprisesId, enterpriseId)];
    if (id) base.push(eq(productBrands.id, id));
    return and(...base);
  }

  public async list(enterpriseId: string, query: ListProductBrandsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scope(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(productBrands)
        .where(where)
        .orderBy(asc(productBrands.description), asc(productBrands.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(productBrands).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select()
        .from(productBrands)
        .where(this.scope(enterpriseId, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Marca de produto nao encontrada",
        "PRODUCT_BRAND_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreateProductBrandInput,
    audit: EntityAuditContext,
  ) {
    const description = await assertEnterpriseCatalogDescriptionAvailable({
      table: productBrands,
      enterpriseId,
      description: input.description,
      conflictCode: "PRODUCT_BRAND_CONFLICT",
      message: "Descricao de marca ja existe na empresa",
    });
    try {
      const [row] = await db
        .insert(productBrands)
        .values({
          enterprisesId: enterpriseId,
          description,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar marca de produto");
      await recordCreateAudit({
        entityType: EntityTypes.PRODUCT_BRANDS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Descricao de marca ja existe na empresa",
          "PRODUCT_BRAND_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchProductBrandInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    const description =
      input.description !== undefined
        ? await assertEnterpriseCatalogDescriptionAvailable({
            table: productBrands,
            enterpriseId,
            description: input.description,
            excludeId: id,
            conflictCode: "PRODUCT_BRAND_CONFLICT",
            message: "Descricao de marca ja existe na empresa",
          })
        : undefined;
    try {
      const [row] = await db
        .update(productBrands)
        .set({
          ...(description !== undefined ? { description } : {}),
          updatedAt: new Date(),
        })
        .where(this.scope(enterpriseId, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Marca de produto nao encontrada",
          "PRODUCT_BRAND_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCT_BRANDS,
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
          "Descricao de marca ja existe na empresa",
          "PRODUCT_BRAND_CONFLICT",
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
      .delete(productBrands)
      .where(this.scope(enterpriseId, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Marca de produto nao encontrada",
        "PRODUCT_BRAND_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.PRODUCT_BRANDS,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const productBrandsService = new ProductBrandsService();
