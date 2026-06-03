import { asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productBrands } from "../../../db/schema.js";
import { NotFoundError } from "../../../shared/errors/app-error.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import type {
  CreateProductBrandInput,
  ListProductBrandsQuery,
  PatchProductBrandInput,
} from "./schema.js";

export class ProductBrandsService {
  public async list(query: ListProductBrandsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(productBrands)
        .orderBy(asc(productBrands.description), asc(productBrands.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(productBrands),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const row = (
      await db
        .select()
        .from(productBrands)
        .where(eq(productBrands.id, id))
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
    input: CreateProductBrandInput,
    audit: EntityAuditContext,
  ) {
    const [row] = await db
      .insert(productBrands)
      .values({ description: input.description.trim() })
      .returning();
    if (!row) throw new Error("Falha ao criar marca de produto");
    await recordCreateAudit({
      entityType: EntityTypes.PRODUCT_BRANDS,
      entityId: row.id,
      after: row,
      ctx: audit,
    });
    return row;
  }

  public async patch(
    id: string,
    input: PatchProductBrandInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(id);
    const [row] = await db
      .update(productBrands)
      .set({
        ...(input.description !== undefined
          ? { description: input.description.trim() }
          : {}),
        updatedAt: new Date(),
      })
      .where(eq(productBrands.id, id))
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
  }

  public async delete(id: string, audit: EntityAuditContext) {
    const existing = await this.getById(id);
    const [row] = await db
      .delete(productBrands)
      .where(eq(productBrands.id, id))
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
