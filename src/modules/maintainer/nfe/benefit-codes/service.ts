import { eq } from "drizzle-orm";
import { benefitCode, cstCompativelBenefit } from "../../../../db/schema.js";
import { db } from "../../../../db/schema.js";
import { EntityTypes } from "../../../../shared/audit/entity-types.js";
import type { EntityAuditContext } from "../../../../shared/audit/entity-audit.js";
import {
  recordCreateAudit,
  recordEntityAudit,
} from "../../../../shared/audit/entity-audit.js";
import { toAuditRecord } from "../../../../shared/audit/build-field-diff.js";
import {
  ConflictError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";
import {
  isPostgresForeignKeyViolation,
  isPostgresUniqueViolation,
} from "../../../../shared/db/postgres-errors.js";
import { createCatalogWriter } from "../catalog-writer.js";
import type {
  CreateBenefitCodeInput,
  LinkCompatibleCstInput,
  PatchBenefitCodeInput,
} from "./schema.js";

const writer = createCatalogWriter({
  table: benefitCode,
  idColumn: benefitCode.id,
  entityType: EntityTypes.BENEFIT_CODE,
  notFoundMessage: "Codigo de beneficio nao encontrado",
  notFoundCode: "BENEFIT_CODE_NOT_FOUND",
  conflictMessage: "Codigo de beneficio em conflito (UF e codigo duplicados)",
  conflictCode: "BENEFIT_CODE_CONFLICT",
});

export class MaintainerBenefitCodesService {
  public create(input: CreateBenefitCodeInput, audit: EntityAuditContext) {
    return writer.create(input, audit);
  }

  public patch(
    id: string,
    input: PatchBenefitCodeInput,
    audit: EntityAuditContext,
  ) {
    return writer.patch(id, input, audit);
  }

  public delete(id: string, audit: EntityAuditContext) {
    return writer.remove(id, audit);
  }

  public async linkCst(
    benefitCodeId: string,
    input: LinkCompatibleCstInput,
    audit: EntityAuditContext,
  ) {
    const parent = await db
      .select({ id: benefitCode.id })
      .from(benefitCode)
      .where(eq(benefitCode.id, benefitCodeId))
      .limit(1);
    if (!parent[0]) {
      throw new NotFoundError(
        "Codigo de beneficio nao encontrado",
        "BENEFIT_CODE_NOT_FOUND",
      );
    }
    try {
      const [row] = await db
        .insert(cstCompativelBenefit)
        .values({
          benefitCodeId,
          situationTributaryCstId: input.situationTributaryCstId,
        })
        .returning();
      if (!row) {
        throw new Error("Falha ao vincular CST ao beneficio");
      }
      await recordCreateAudit({
        entityType: EntityTypes.CST_COMPATIVEL_BENEFIT,
        entityId: row.id,
        after: row,
        ctx: audit,
      });
      return row;
    } catch (err) {
      if (isPostgresUniqueViolation(err)) {
        throw new ConflictError(
          "CST ja vinculado a este beneficio",
          "CST_COMPATIVEL_BENEFIT_CONFLICT",
        );
      }
      if (isPostgresForeignKeyViolation(err)) {
        throw new NotFoundError("CST nao encontrado", "CST_NOT_FOUND");
      }
      throw err;
    }
  }

  public async unlinkCst(linkId: string, audit: EntityAuditContext) {
    const rows = await db
      .select()
      .from(cstCompativelBenefit)
      .where(eq(cstCompativelBenefit.id, linkId))
      .limit(1);
    const existing = rows[0];
    if (!existing) {
      throw new NotFoundError(
        "Vinculo de CST com beneficio nao encontrado",
        "CST_COMPATIVEL_BENEFIT_NOT_FOUND",
      );
    }
    const [row] = await db
      .delete(cstCompativelBenefit)
      .where(eq(cstCompativelBenefit.id, linkId))
      .returning();
    if (!row) {
      throw new NotFoundError(
        "Vinculo de CST com beneficio nao encontrado",
        "CST_COMPATIVEL_BENEFIT_NOT_FOUND",
      );
    }
    await recordEntityAudit({
      entityType: EntityTypes.CST_COMPATIVEL_BENEFIT,
      entityId: linkId,
      action: "DELETE",
      before: toAuditRecord(existing),
      after: toAuditRecord(row),
      ctx: audit,
    });
    return row;
  }
}

export const maintainerBenefitCodesService = new MaintainerBenefitCodesService();
