import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  icmsTaxation,
  pisCofinsSituation,
  productTaxation,
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

  private async assertPisCofinsSituationExists(pisCofinsSituationId: string) {
    const row = (
      await db
        .select({ id: pisCofinsSituation.id })
        .from(pisCofinsSituation)
        .where(eq(pisCofinsSituation.id, pisCofinsSituationId))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Situacao PIS/COFINS nao encontrada",
        "PIS_COFINS_SITUATION_NOT_FOUND",
      );
    }
  }

  private async assertPisCofinsSituationsExist(ids: string[]) {
    await Promise.all(ids.map((id) => this.assertPisCofinsSituationExists(id)));
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
      this.assertPisCofinsSituationsExist([
        input.cstPisEntradaId,
        input.cstPisSaidaId,
        input.cstCofinsEntradaId,
        input.cstCofinsSaidaId,
      ]),
    ]);
    try {
      const [row] = await db
        .insert(productTaxation)
        .values({
          cstPisEntradaId: input.cstPisEntradaId,
          cstPisSaidaId: input.cstPisSaidaId,
          cstCofinsEntradaId: input.cstCofinsEntradaId,
          cstCofinsSaidaId: input.cstCofinsSaidaId,
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
    const pisCofinsIds = [
      input.cstPisEntradaId,
      input.cstPisSaidaId,
      input.cstCofinsEntradaId,
      input.cstCofinsSaidaId,
    ].filter((value): value is string => value !== undefined);
    if (pisCofinsIds.length > 0) {
      await this.assertPisCofinsSituationsExist(pisCofinsIds);
    }
    try {
      const [row] = await db
        .update(productTaxation)
        .set({
          ...(input.cstPisEntradaId !== undefined
            ? { cstPisEntradaId: input.cstPisEntradaId }
            : {}),
          ...(input.cstPisSaidaId !== undefined
            ? { cstPisSaidaId: input.cstPisSaidaId }
            : {}),
          ...(input.cstCofinsEntradaId !== undefined
            ? { cstCofinsEntradaId: input.cstCofinsEntradaId }
            : {}),
          ...(input.cstCofinsSaidaId !== undefined
            ? { cstCofinsSaidaId: input.cstCofinsSaidaId }
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
