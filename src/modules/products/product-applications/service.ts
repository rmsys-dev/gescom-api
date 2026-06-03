import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productApplication, productsEnterprises } from "../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../../shared/db/postgres-errors.js";
import { resolveListPagination } from "../../../shared/pagination/pagination-params.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  withEnterpriseAuditContext,
  type EntityAuditContext,
} from "../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import { getProductEnterpriseForStock } from "../../stock/balance.js";
import type {
  CreateProductApplicationInput,
  ListProductApplicationsQuery,
  PatchProductApplicationInput,
} from "./schema.js";

export class ProductApplicationsService {
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(productsEnterprises.enterprisesId, enterpriseId)];
    if (id) base.push(eq(productApplication.id, id));
    return and(...base);
  }

  public async list(
    enterpriseId: string,
    query: ListProductApplicationsQuery = {},
  ) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scope(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db
        .select({
          id: productApplication.id,
          description: productApplication.description,
          productsEnterprisesId: productApplication.productsEnterprisesId,
          createdAt: productApplication.createdAt,
          updatedAt: productApplication.updatedAt,
        })
        .from(productApplication)
        .innerJoin(
          productsEnterprises,
          eq(productApplication.productsEnterprisesId, productsEnterprises.id),
        )
        .where(where)
        .orderBy(
          asc(productApplication.description),
          asc(productApplication.id),
        )
        .limit(limit)
        .offset(offset),
      db
        .select({ c: count() })
        .from(productApplication)
        .innerJoin(
          productsEnterprises,
          eq(productApplication.productsEnterprisesId, productsEnterprises.id),
        )
        .where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select({
          id: productApplication.id,
          description: productApplication.description,
          productsEnterprisesId: productApplication.productsEnterprisesId,
          createdAt: productApplication.createdAt,
          updatedAt: productApplication.updatedAt,
        })
        .from(productApplication)
        .innerJoin(
          productsEnterprises,
          eq(productApplication.productsEnterprisesId, productsEnterprises.id),
        )
        .where(this.scope(enterpriseId, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Aplicacao de produto nao encontrada",
        "PRODUCT_APPLICATION_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreateProductApplicationInput,
    audit: EntityAuditContext,
  ) {
    await getProductEnterpriseForStock(
      enterpriseId,
      input.productsEnterprisesId,
    );
    const ctx = withEnterpriseAuditContext(audit, enterpriseId);
    try {
      const [row] = await db
        .insert(productApplication)
        .values({
          description: input.description,
          productsEnterprisesId: input.productsEnterprisesId,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar aplicacao de produto/empresa");
      await recordCreateAudit({
        entityType: EntityTypes.PRODUCT_APPLICATIONS,
        entityId: row.id,
        after: row,
        ctx,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Ja existe aplicacao com esta descricao para o mesmo produto/empresa",
          "PRODUCT_APPLICATION_DESCRIPTION_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchProductApplicationInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    const ctx = withEnterpriseAuditContext(audit, enterpriseId);
    if (input.productsEnterprisesId) {
      await getProductEnterpriseForStock(
        enterpriseId,
        input.productsEnterprisesId,
      );
    }
    try {
      const [row] = await db
        .update(productApplication)
        .set({
          ...(input.description !== undefined
            ? { description: input.description }
            : {}),
          ...(input.productsEnterprisesId !== undefined
            ? { productsEnterprisesId: input.productsEnterprisesId }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(productApplication.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Aplicacao de produto nao encontrada",
          "PRODUCT_APPLICATION_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCT_APPLICATIONS,
        entityId: id,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Ja existe aplicacao com esta descricao para o mesmo produto/empresa",
          "PRODUCT_APPLICATION_DESCRIPTION_CONFLICT",
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
    const ctx = withEnterpriseAuditContext(audit, enterpriseId);
    const [row] = await db
      .delete(productApplication)
      .where(eq(productApplication.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Aplicacao de produto nao encontrada",
        "PRODUCT_APPLICATION_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.PRODUCT_APPLICATIONS,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx,
    });
    return row;
  }
}

export const productApplicationsService = new ProductApplicationsService();
