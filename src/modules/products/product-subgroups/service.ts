import { and, asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productSubgroups } from "../../../db/schema.js";
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
  CreateProductSubgroupInput,
  ListProductSubgroupsQuery,
  PatchProductSubgroupInput,
} from "./schema.js";

const formatSubgroupPercentage = (value: number) =>
  Math.round(value * 100) / 100;

const mapSubgroupCommissionFieldsToInsert = (
  input: Pick<
    CreateProductSubgroupInput,
    | "generatesComission"
    | "comissionOnSightSeller"
    | "comissionToTermsSeller"
    | "comissionPartialSeller"
    | "comissionOnSightManager"
    | "comissionToTermsManager"
    | "comissionPartialManager"
  >,
): Partial<typeof productSubgroups.$inferInsert> => ({
  ...(input.generatesComission !== undefined
    ? { generatesComission: input.generatesComission }
    : {}),
  ...(input.comissionOnSightSeller !== undefined
    ? {
        comissionOnSightSeller: formatSubgroupPercentage(
          input.comissionOnSightSeller,
        ).toFixed(2),
      }
    : {}),
  ...(input.comissionToTermsSeller !== undefined
    ? {
        comissionToTermsSeller: formatSubgroupPercentage(
          input.comissionToTermsSeller,
        ).toFixed(2),
      }
    : {}),
  ...(input.comissionPartialSeller !== undefined
    ? {
        comissionPartialSeller: formatSubgroupPercentage(
          input.comissionPartialSeller,
        ).toFixed(2),
      }
    : {}),
  ...(input.comissionOnSightManager !== undefined
    ? {
        comissionOnSightManager: formatSubgroupPercentage(
          input.comissionOnSightManager,
        ).toFixed(2),
      }
    : {}),
  ...(input.comissionToTermsManager !== undefined
    ? {
        comissionToTermsManager: formatSubgroupPercentage(
          input.comissionToTermsManager,
        ).toFixed(2),
      }
    : {}),
  ...(input.comissionPartialManager !== undefined
    ? {
        comissionPartialManager: formatSubgroupPercentage(
          input.comissionPartialManager,
        ).toFixed(2),
      }
    : {}),
});

export class ProductSubgroupsService {
  private scope(enterpriseId: string, id?: string) {
    const base = [eq(productSubgroups.enterprisesId, enterpriseId)];
    if (id) base.push(eq(productSubgroups.id, id));
    return and(...base);
  }

  public async list(enterpriseId: string, query: ListProductSubgroupsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const where = this.scope(enterpriseId);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(productSubgroups)
        .where(where)
        .orderBy(asc(productSubgroups.description), asc(productSubgroups.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(productSubgroups).where(where),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(enterpriseId: string, id: string) {
    const row = (
      await db
        .select()
        .from(productSubgroups)
        .where(this.scope(enterpriseId, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Subgrupo de produto nao encontrado",
        "PRODUCT_SUBGROUP_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    enterpriseId: string,
    input: CreateProductSubgroupInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(productSubgroups)
        .values({
          enterprisesId: enterpriseId,
          description: input.description.trim(),
          ...mapSubgroupCommissionFieldsToInsert(input),
        })
        .returning();
      if (!row) throw new Error("Falha ao criar subgrupo de produto");
      await recordCreateAudit({
        entityType: EntityTypes.PRODUCT_SUBGROUPS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Descricao de subgrupo ja existe na empresa",
          "PRODUCT_SUBGROUP_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    enterpriseId: string,
    id: string,
    input: PatchProductSubgroupInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(enterpriseId, id);
    try {
      const [row] = await db
        .update(productSubgroups)
        .set({
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...mapSubgroupCommissionFieldsToInsert(input),
          updatedAt: new Date(),
        })
        .where(this.scope(enterpriseId, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Subgrupo de produto nao encontrado",
          "PRODUCT_SUBGROUP_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCT_SUBGROUPS,
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
          "Descricao de subgrupo ja existe na empresa",
          "PRODUCT_SUBGROUP_CONFLICT",
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
      .delete(productSubgroups)
      .where(this.scope(enterpriseId, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Subgrupo de produto nao encontrado",
        "PRODUCT_SUBGROUP_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.PRODUCT_SUBGROUPS,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const productSubgroupsService = new ProductSubgroupsService();
