import { and, asc, count, eq, ilike, isNull, or } from "drizzle-orm";
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

type ProductRow = typeof products.$inferSelect;

export class ProductsService {
  /**
   * Resolve produto raiz pela chave única (description + barCode).
   * Sem barCode no input → procura descrição com barCode NULL.
   */
  private async findExistingProduct(
    description: string,
    barCode?: string,
  ): Promise<ProductRow | null> {
    const conditions = [eq(products.description, description)];
    if (barCode !== undefined) {
      conditions.push(eq(products.barCode, barCode));
    } else {
      conditions.push(isNull(products.barCode));
    }
    const row = (
      await db
        .select()
        .from(products)
        .where(and(...conditions))
        .limit(1)
    )[0];
    return row ?? null;
  }

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

  /**
   * POST /products — espelha create-with-user de membros:
   * cria produto raiz + vínculo, ou, se a chave (description + barCode) já
   * existir, apenas o vínculo (`linkedExistingProduct: true`).
   * Não actualiza campos da raiz quando reutiliza produto existente.
   */
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

    const description = input.product.description.trim();
    const barCode =
      input.product.barCode !== undefined
        ? input.product.barCode.trim()
        : undefined;

    const linkExisting = async (product: ProductRow) => {
      const enterprise = await productsEnterprisesService.createForProduct(
        enterpriseId,
        product.id,
        input.enterprise,
        undefined,
        enterpriseAudit,
      );
      return {
        product,
        enterprise,
        linkedExistingProduct: true as const,
      };
    };

    const existing = await this.findExistingProduct(description, barCode);
    if (existing) {
      return linkExisting(existing);
    }

    try {
      return await db.transaction(async (tx) => {
        const [product] = await tx
          .insert(products)
          .values({
            status: input.product.status ?? "ATIVO",
            description,
            ...(barCode !== undefined ? { barCode } : {}),
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

        const enterprise = await productsEnterprisesService.createForProduct(
          enterpriseId,
          product.id,
          input.enterprise,
          tx,
          enterpriseAudit,
        );

        return {
          product,
          enterprise,
          linkedExistingProduct: false as const,
        };
      });
    } catch (err) {
      if (err instanceof ConflictError) {
        throw err;
      }
      if (isPostgresUniqueViolation(err)) {
        // Corrida: outro request criou a mesma chave — reutiliza e vincula.
        const raced = await this.findExistingProduct(description, barCode);
        if (raced) {
          return linkExisting(raced);
        }
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
