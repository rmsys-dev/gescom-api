import { and, asc, count, eq, ilike, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products } from "../../db/schema.js";
import { ConflictError, NotFoundError } from "../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  withEnterpriseAuditContext,
  type EntityAuditContext,
} from "../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../shared/audit/entity-types.js";
import { productsEnterprisesService } from "./products-enterprises/service.js";
import type {
  CreateProductWithEnterpriseInput,
  ListProductsQuery,
  PatchProductInput,
} from "./schema.js";

export class ProductsService {
  public async list(query: ListProductsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const conditions = [];
    if (query.status) {
      conditions.push(eq(products.status, query.status));
    }
    if (query.search) {
      const term = `%${query.search}%`;
      conditions.push(
        or(ilike(products.description, term), ilike(products.barCode, term))!,
      );
    }
    const where = conditions.length > 0 ? and(...conditions) : undefined;
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(products)
        .where(where)
        .orderBy(asc(products.description), asc(products.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(products).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const row = (
      await db.select().from(products).where(eq(products.id, id)).limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError("Produto nao encontrado", "PRODUCT_NOT_FOUND");
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreateProductWithEnterpriseInput,
    audit: EntityAuditContext,
  ) {
    await productsEnterprisesService.assertEnterprisePayload(
      enterpriseId,
      input.enterprise,
    );
    const enterpriseAudit = withEnterpriseAuditContext(audit, enterpriseId);

    try {
      return await db.transaction(async (tx) => {
        const [product] = await tx
          .insert(products)
          .values({
            status: input.product.status ?? "ATIVO",
            description: input.product.description.trim(),
            ...(input.product.barCode !== undefined
              ? { barCode: input.product.barCode.trim() }
              : {}),
          })
          .returning();
        if (!product) throw new Error("Falha ao criar produto");

        await recordCreateAudit({
          entityType: EntityTypes.PRODUCTS,
          entityId: product.id,
          after: product,
          ctx: enterpriseAudit,
          tx,
        });

        return productsEnterprisesService.createForProduct(
          enterpriseId,
          product.id,
          input.enterprise,
          tx,
          enterpriseAudit,
        );
      });
    } catch (err) {
      if (err instanceof ConflictError) {
        throw err;
      }
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Produto em conflito (descricao ou codigo de barras duplicado)",
          "PRODUCT_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    id: string,
    input: PatchProductInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(id);
    try {
      const [row] = await db
        .update(products)
        .set({
          ...(input.status !== undefined ? { status: input.status } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.barCode !== undefined
            ? { barCode: input.barCode.trim() }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(products.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError("Produto nao encontrado", "PRODUCT_NOT_FOUND");
      }
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCTS,
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
          "Produto em conflito (descricao ou codigo de barras duplicado)",
          "PRODUCT_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(id: string, audit: EntityAuditContext) {
    const existing = await this.getById(id);
    const [row] = await db
      .delete(products)
      .where(eq(products.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError("Produto nao encontrado", "PRODUCT_NOT_FOUND");
    }
    await recordEntityAudit({
      entityType: EntityTypes.PRODUCTS,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const productsService = new ProductsService();
