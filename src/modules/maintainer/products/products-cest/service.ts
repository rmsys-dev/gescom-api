import { eq } from "drizzle-orm";
import { db, productsCest } from "../../../../db/schema.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";
import { isPostgresUniqueViolation } from "../../../../shared/db/postgres-errors.js";
import {
  recordCreateAudit,
  recordEntityAudit,
  type EntityAuditContext,
} from "../../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../../shared/audit/build-field-diff.js";
import { EntityTypes } from "../../../../shared/audit/entity-types.js";
import type {
  CreateMaintainerProductsCestInput,
  PatchMaintainerProductsCestInput,
} from "./schema.js";

export class MaintainerProductsCestService {
  private async getById(id: string) {
    const rows = await db
      .select()
      .from(productsCest)
      .where(eq(productsCest.id, id))
      .limit(1);
    const row = rows[0];
    if (!row) {
      throw new NotFoundError(
        "CEST de produto nao encontrado",
        "PRODUCTS_CEST_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    input: CreateMaintainerProductsCestInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(productsCest)
        .values({
          cest: input.cest,
          description: input.description.trim(),
          productsNcmId: input.productsNcmId,
        })
        .returning();
      if (!row) {
        throw new Error("Falha ao criar CEST de produto");
      }
      await recordCreateAudit({
        entityType: EntityTypes.PRODUCTS_CEST,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "CEST de produto em conflito (cest duplicado)",
          "PRODUCTS_CEST_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    productsCestId: string,
    input: PatchMaintainerProductsCestInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(productsCestId);
    const now = new Date();

    try {
      const [row] = await db
        .update(productsCest)
        .set({
          ...(input.cest !== undefined ? { cest: input.cest } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.productsNcmId !== undefined
            ? { productsNcmId: input.productsNcmId }
            : {}),
          updatedAt: now,
        })
        .where(eq(productsCest.id, productsCestId))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "CEST de produto nao encontrado",
          "PRODUCTS_CEST_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCTS_CEST,
        entityId: productsCestId,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "CEST de produto em conflito (cest duplicado)",
          "PRODUCTS_CEST_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(productsCestId: string, audit: EntityAuditContext) {
    const existing = await this.getById(productsCestId);
    const [row] = await db
      .delete(productsCest)
      .where(eq(productsCest.id, productsCestId))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "CEST de produto nao encontrado",
        "PRODUCTS_CEST_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.PRODUCTS_CEST,
      entityId: productsCestId,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const maintainerProductsCestService =
  new MaintainerProductsCestService();
