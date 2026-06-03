import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  icmsTaxation,
  productTaxation,
  products,
  productsEnterprises,
} from "../../../db/schema.js";
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
  CreateProductTaxationInput,
  ListProductTaxationQuery,
  PatchProductTaxationInput,
} from "./schema.js";

export class ProductTaxationService {
  private scope(id?: string) {
    const base = [];
    if (id) base.push(eq(productTaxation.id, id));
    return and(...base);
  }

  private async assertProductExists(productsEnterprisesId: string) {
    const row = (
      await db
        .select({ id: productsEnterprises.id })
        .from(productsEnterprises)
        .where(eq(productsEnterprises.id, productsEnterprisesId))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Produto/empresa nao encontrado",
        "PRODUCT_ENTERPRISE _NOT_FOUND",
      );
    }
  }

  private async assertIcmsExists(icmsTaxationId: string) {
    const row = (
      await db
        .select({ id: icmsTaxation.id })
        .from(icmsTaxation)
        .where(eq(icmsTaxation.id, icmsTaxationId))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Tributacao do ICMS nao encontrada",
        "ICMS_TAXATION_NOT_FOUND",
      );
    }
  }

  public async list(query: ListProductTaxationQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scope();
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(productTaxation)
        .where(where)
        .orderBy(asc(productTaxation.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(productTaxation).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const row = (
      await db.select().from(productTaxation).where(this.scope(id)).limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Tributacao do produto nao encontrada",
        "PRODUCT_TAXATION_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    input: CreateProductTaxationInput,
    audit: EntityAuditContext,
  ) {
    await Promise.all([
      this.assertProductExists(input.productsEnterprisesId),
      this.assertIcmsExists(input.icmsTaxationId),
    ]);
    try {
      const [row] = await db
        .insert(productTaxation)
        .values({
          cst_pis_entrada: input.cst_pis_entrada.trim(),
          cst_pis_saida: input.cst_pis_saida.trim(),
          cst_cofins_entrada: input.cst_cofins_entrada.trim(),
          cst_cofins_saida: input.cst_cofins_saida.trim(),
          productsEnterprisesId: input.productsEnterprisesId,
          icmsTaxationId: input.icmsTaxationId,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar tributacao do produto");
      await recordCreateAudit({
        entityType: EntityTypes.PRODUCT_TAXATION,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Tributacao do produto ja existe para este produto/empresa",
          "PRODUCT_TAXATION_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    id: string,
    input: PatchProductTaxationInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(id);
    if (input.productsEnterprisesId)
      await this.assertProductExists(input.productsEnterprisesId);
    if (input.icmsTaxationId) {
      await this.assertIcmsExists(input.icmsTaxationId);
    }
    try {
      const [row] = await db
        .update(productTaxation)
        .set({
          ...(input.cst_pis_entrada !== undefined
            ? { cst_pis_entrada: input.cst_pis_entrada.trim() }
            : {}),
          ...(input.cst_pis_saida !== undefined
            ? { cst_pis_saida: input.cst_pis_saida.trim() }
            : {}),
          ...(input.cst_cofins_entrada !== undefined
            ? { cst_cofins_entrada: input.cst_cofins_entrada.trim() }
            : {}),
          ...(input.cst_cofins_saida !== undefined
            ? { cst_cofins_saida: input.cst_cofins_saida.trim() }
            : {}),
          ...(input.productsEnterprisesId !== undefined
            ? { productsEnterprisesId: input.productsEnterprisesId }
            : {}),
          ...(input.icmsTaxationId !== undefined
            ? { icmsTaxationId: input.icmsTaxationId }
            : {}),
          updatedAt: new Date(),
        })
        .where(this.scope(id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Tributacao do produto nao encontrada",
          "PRODUCT_TAXATION_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCT_TAXATION,
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
          "Tributacao do produto ja existe para este produto/empresa",
          "PRODUCT_TAXATION_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(id: string, audit: EntityAuditContext) {
    const existing = await this.getById(id);
    const [row] = await db
      .delete(productTaxation)
      .where(this.scope(id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Tributacao do produto nao encontrada",
        "PRODUCT_TAXATION_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.PRODUCT_TAXATION,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const productTaxationService = new ProductTaxationService();
