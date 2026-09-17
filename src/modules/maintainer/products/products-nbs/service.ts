import { eq } from "drizzle-orm";
import { db, productsNbs } from "../../../../db/schema.js";
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
  CreateMaintainerProductsNbsInput,
  PatchMaintainerProductsNbsInput,
} from "./schema.js";

const mapInputToRow = (input: CreateMaintainerProductsNbsInput) => ({
  lc116Item: input.lc116Item,
  lc116Description: input.lc116Description.trim(),
  nbs: input.nbs,
  description: input.description.trim(),
  psOnerosa: input.psOnerosa,
  adqExterior: input.adqExterior,
  indop: input.indop,
  cClassTrib: input.cClassTrib,
  cClassTribName: input.cClassTribName.trim(),
});

export class MaintainerProductsNbsService {
  private async getById(id: string) {
    const row = (
      await db.select().from(productsNbs).where(eq(productsNbs.id, id)).limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "NBS de servico nao encontrado",
        "PRODUCTS_NBS_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    input: CreateMaintainerProductsNbsInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(productsNbs)
        .values(mapInputToRow(input))
        .returning();
      if (!row) {
        throw new Error("Falha ao criar NBS de servico");
      }
      await recordCreateAudit({
        entityType: EntityTypes.PRODUCTS_NBS,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "NBS de servico em conflito (lc116 + nbs + cClassTrib duplicado)",
          "PRODUCTS_NBS_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    productsNbsId: string,
    input: PatchMaintainerProductsNbsInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(productsNbsId);
    const now = new Date();

    try {
      const [row] = await db
        .update(productsNbs)
        .set({
          ...(input.lc116Item !== undefined
            ? { lc116Item: input.lc116Item }
            : {}),
          ...(input.lc116Description !== undefined
            ? { lc116Description: input.lc116Description.trim() }
            : {}),
          ...(input.nbs !== undefined ? { nbs: input.nbs } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.psOnerosa !== undefined
            ? { psOnerosa: input.psOnerosa }
            : {}),
          ...(input.adqExterior !== undefined
            ? { adqExterior: input.adqExterior }
            : {}),
          ...(input.indop !== undefined ? { indop: input.indop } : {}),
          ...(input.cClassTrib !== undefined
            ? { cClassTrib: input.cClassTrib }
            : {}),
          ...(input.cClassTribName !== undefined
            ? { cClassTribName: input.cClassTribName.trim() }
            : {}),
          updatedAt: now,
        })
        .where(eq(productsNbs.id, productsNbsId))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "NBS de servico nao encontrado",
          "PRODUCTS_NBS_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PRODUCTS_NBS,
        entityId: productsNbsId,
        action: "UPDATE",
        before: toAuditRecord(existing),
        after: toAuditRecord(row),
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "NBS de servico em conflito (lc116 + nbs + cClassTrib duplicado)",
          "PRODUCTS_NBS_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(productsNbsId: string, audit: EntityAuditContext) {
    const existing = await this.getById(productsNbsId);
    const [row] = await db
      .delete(productsNbs)
      .where(eq(productsNbs.id, productsNbsId))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "NBS de servico nao encontrado",
        "PRODUCTS_NBS_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.PRODUCTS_NBS,
      entityId: productsNbsId,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const maintainerProductsNbsService = new MaintainerProductsNbsService();
