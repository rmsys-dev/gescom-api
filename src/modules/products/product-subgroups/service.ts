import { asc, count, eq } from "drizzle-orm";
import { db } from "../../../db/index.js";
import { productSubgroups } from "../../../db/schema.js";
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
  public async list(query: ListProductSubgroupsQuery = {}) {
    const { limit, offset } = resolveListPagination(query);
    const [items, totalRows] = await Promise.all([
      db
        .select()
        .from(productSubgroups)
        .orderBy(asc(productSubgroups.description), asc(productSubgroups.id))
        .limit(limit)
        .offset(offset),
      db.select({ c: count() }).from(productSubgroups),
    ]);
    const total = Number(totalRows[0]?.c ?? 0);
    return { items, total, limit, offset };
  }

  public async getById(id: string) {
    const row = (
      await db
        .select()
        .from(productSubgroups)
        .where(eq(productSubgroups.id, id))
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
    input: CreateProductSubgroupInput,
    audit: EntityAuditContext,
  ) {
    const [row] = await db
      .insert(productSubgroups)
      .values({
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
  }

  public async patch(
    id: string,
    input: PatchProductSubgroupInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(id);
    const [row] = await db
      .update(productSubgroups)
      .set({
        ...(input.description !== undefined
          ? { description: input.description.trim() }
          : {}),
        ...mapSubgroupCommissionFieldsToInsert(input),
        updatedAt: new Date(),
      })
      .where(eq(productSubgroups.id, id))
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
  }

  public async delete(id: string, audit: EntityAuditContext) {
    const existing = await this.getById(id);
    const [row] = await db
      .delete(productSubgroups)
      .where(eq(productSubgroups.id, id))
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
