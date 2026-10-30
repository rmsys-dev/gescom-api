import { eq } from "drizzle-orm";
import { db, pisCofinsSituation } from "../../../../db/schema.js";
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
  CreateMaintainerPisCofinsSituationInput,
  PatchMaintainerPisCofinsSituationInput,
} from "./schema.js";

export class MaintainerPisCofinsSituationService {
  private async getById(id: string) {
    const row = (
      await db
        .select()
        .from(pisCofinsSituation)
        .where(eq(pisCofinsSituation.id, id))
        .limit(1)
    )[0];
    if (!row) {
      throw new NotFoundError(
        "Situacao PIS/COFINS nao encontrada",
        "PIS_COFINS_SITUATION_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(
    input: CreateMaintainerPisCofinsSituationInput,
    audit: EntityAuditContext,
  ) {
    try {
      const [row] = await db
        .insert(pisCofinsSituation)
        .values({
          cst: input.cst.trim(),
          description: input.description.trim(),
          type: input.type,
          framing: input.framing,
          pisRate:
            input.pisRate !== undefined ? input.pisRate.toString() : null,
          cofinsRate:
            input.cofinsRate !== undefined ? input.cofinsRate.toString() : null,
        })
        .returning();
      if (!row) throw new Error("Falha ao criar situacao PIS/COFINS");
      await recordCreateAudit({
        entityType: EntityTypes.PIS_COFINS_SITUATION,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "Situacao PIS/COFINS em conflito (CST duplicado)",
          "PIS_COFINS_SITUATION_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async patch(
    id: string,
    input: PatchMaintainerPisCofinsSituationInput,
    audit: EntityAuditContext,
  ) {
    const existing = await this.getById(id);
    try {
      const [row] = await db
        .update(pisCofinsSituation)
        .set({
          ...(input.cst !== undefined ? { cst: input.cst.trim() } : {}),
          ...(input.description !== undefined
            ? { description: input.description.trim() }
            : {}),
          ...(input.type !== undefined ? { type: input.type } : {}),
          ...(input.framing !== undefined ? { framing: input.framing } : {}),
          ...(input.pisRate !== undefined
            ? {
                pisRate:
                  input.pisRate === null ? null : input.pisRate.toString(),
              }
            : {}),
          ...(input.cofinsRate !== undefined
            ? {
                cofinsRate:
                  input.cofinsRate === null
                    ? null
                    : input.cofinsRate.toString(),
              }
            : {}),
          updatedAt: new Date(),
        })
        .where(eq(pisCofinsSituation.id, id))
        .returning();
      if (!row) {
        throw new NotFoundError(
          "Situacao PIS/COFINS nao encontrada",
          "PIS_COFINS_SITUATION_NOT_FOUND",
        );
      }
      await recordEntityAudit({
        entityType: EntityTypes.PIS_COFINS_SITUATION,
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
          "Situacao PIS/COFINS em conflito (CST duplicado)",
          "PIS_COFINS_SITUATION_CONFLICT",
        );
      }
      throw err;
    }
  }

  public async delete(id: string, audit: EntityAuditContext) {
    const existing = await this.getById(id);
    const [row] = await db
      .delete(pisCofinsSituation)
      .where(eq(pisCofinsSituation.id, id))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Situacao PIS/COFINS nao encontrada",
        "PIS_COFINS_SITUATION_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.PIS_COFINS_SITUATION,
      entityId: id,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const maintainerPisCofinsSituationService =
  new MaintainerPisCofinsSituationService();
