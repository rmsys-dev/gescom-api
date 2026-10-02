import { and, asc, count, eq, ilike, isNull, or } from "drizzle-orm";
import { db } from "../../db/index.js";
import { products, productsEnterprises } from "../../db/schema.js";
import { ConflictError, NotFoundError } from "../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  withEnterpriseAuditContext,
  type EntityAuditContext,
} from "../../shared/audit/entity-audit.js";
import { EntityTypes } from "../../shared/audit/entity-types.js";
import { productsEnterprisesService } from "./products-enterprises/service.js";
import type {
  CreateProductInput,
  CreateProductWithEnterpriseInput,
  ListProductsQuery,
  PatchProductInput,
} from "./schema.js";

type ProductRow = typeof products.$inferSelect;

export class ProductsService {
  /**
   * Resolve produto raiz para snapshot:
   * - com barCode → unicidade global do código de barras (ignora descrição);
   * - sem barCode → mesma descrição com barCode NULL.
   */
  private async findExistingProduct(
    description: string,
    barCode?: string,
  ): Promise<ProductRow | null> {
    const where =
      barCode !== undefined
        ? eq(products.barCode, barCode)
        : and(eq(products.description, description), isNull(products.barCode));
    const row = (
      await db.select().from(products).where(where).limit(1)
    )[0];
    return row ?? null;
  }

  private async assertProductNotLinkedToEnterprise(
    enterpriseId: string,
    productId: string,
  ): Promise<void> {
    const [linked] = await db
      .select({ id: productsEnterprises.id })
      .from(productsEnterprises)
      .where(
        and(
          eq(productsEnterprises.productId, productId),
          eq(productsEnterprises.enterprisesId, enterpriseId),
        ),
      )
      .limit(1);
    if (linked) {
      throw new ConflictError(
        "Produto ja vinculado a esta empresa",
        "PRODUCT_ENTERPRISE_CONFLICT",
      );
    }
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
   * cria produto raiz + snapshot em products-enterprises, ou, se o barCode
   * (ou a descrição sem barCode) já existir, apenas o snapshot
   * (`linkedExistingProduct: true`). Não actualiza a raiz ao reutilizar.
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
      await this.assertProductNotLinkedToEnterprise(enterpriseId, product.id);
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
        // Corrida: outro request criou a mesma chave — reutiliza e faz snapshot.
        const raced = await this.findExistingProduct(description, barCode);
        if (raced) {
          return linkExisting(raced);
        }
        throw new ConflictError(
          "Produto em conflito (codigo de barras ou descricao duplicados)",
          "PRODUCT_CONFLICT",
        );
      }
      throw err;
    }
  }

  private conflict(err: unknown): never {
    if (isPostgresUniqueViolation(err)) {
      throw new ConflictError(
        "Ja existe produto base com este codigo de barras ou descricao",
        "PRODUCT_CONFLICT",
      );
    }
    throw err;
  }

  public async createBase(input: CreateProductInput, audit: EntityAuditContext) {
    const description = input.description.trim();
    const barCode = input.barCode?.trim() || undefined;
    if (await this.findExistingProduct(description, barCode)) {
      throw new ConflictError(
        "Ja existe produto base com este codigo de barras ou descricao",
        "PRODUCT_CONFLICT",
      );
    }
    try {
      return await db.transaction(async (tx) => {
        const [product] = await tx
          .insert(products)
          .values({
            status: input.status ?? "ATIVO",
            description,
            ...(barCode !== undefined ? { barCode } : {}),
          })
          .returning();
        if (!product) throw new Error("Falha ao criar produto");
        await recordCreateAudit({
          entityType: EntityTypes.PRODUCTS,
          entityId: product.id,
          after: product,
          ctx: audit,
          tx,
        });
        return product;
      });
    } catch (err) {
      return this.conflict(err);
    }
  }

  public async patch(id: string, input: PatchProductInput, audit: EntityAuditContext) {
    const before = await this.getById(id);
    const barCode =
      input.barCode === undefined ? undefined : input.barCode?.trim() || null;
    try {
      return await db.transaction(async (tx) => {
        const [after] = await tx
          .update(products)
          .set({
            ...(input.status !== undefined ? { status: input.status } : {}),
            ...(input.description !== undefined
              ? { description: input.description.trim() }
              : {}),
            ...(barCode !== undefined ? { barCode } : {}),
            updatedAt: new Date(),
          })
          .where(eq(products.id, id))
          .returning();
        if (!after) {
          throw new NotFoundError("Produto nao encontrado", "PRODUCT_NOT_FOUND");
        }
        await recordEntityAudit({
          entityType: EntityTypes.PRODUCTS,
          entityId: id,
          action: "UPDATE",
          before,
          after,
          ctx: audit,
          tx,
        });
        return after;
      });
    } catch (err) {
      return this.conflict(err);
    }
  }

  public async remove(id: string, audit: EntityAuditContext) {
    const before = await this.getById(id);
    const [linked] = await db
      .select({ id: productsEnterprises.id })
      .from(productsEnterprises)
      .where(eq(productsEnterprises.productId, id))
      .limit(1);
    if (linked) {
      throw new ConflictError(
        "Produto base em uso por produto de empresa. Inative-o em vez de excluir.",
        "PRODUCT_IN_USE",
      );
    }
    await db.transaction(async (tx) => {
      await tx.delete(products).where(eq(products.id, id));
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCTS,
        entityId: id,
        action: "DELETE",
        before,
        after: {},
        ctx: audit,
        tx,
      });
    });
    return { id };
  }
}

export const productsService = new ProductsService();
