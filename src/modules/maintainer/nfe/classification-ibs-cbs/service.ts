import { eq } from "drizzle-orm";
import { classificationIbsCbs, db } from "../../../../db/schema.js";
import {
  BadRequestError,
  NotFoundError,
} from "../../../../shared/errors/app-error.js";
import { EntityTypes } from "../../../../shared/audit/entity-types.js";
import type { EntityAuditContext } from "../../../../shared/audit/entity-audit.js";
import { createCatalogWriter } from "../catalog-writer.js";
import type {
  CreateClassificationInput,
  PatchClassificationInput,
} from "./schema.js";

const writer = createCatalogWriter({
  table: classificationIbsCbs,
  idColumn: classificationIbsCbs.id,
  entityType: EntityTypes.CLASSIFICATION_IBS_CBS,
  notFoundMessage: "Classificacao IBS/CBS nao encontrada",
  notFoundCode: "CLASSIFICATION_IBS_CBS_NOT_FOUND",
  conflictMessage: "Classificacao IBS/CBS em conflito (cClassTrib duplicado)",
  conflictCode: "CLASSIFICATION_IBS_CBS_CONFLICT",
});

const rates = (input: { pRedIbs?: number | null; pRedCbs?: number | null }) => ({
  ...(input.pRedIbs !== undefined
    ? { pRedIbs: input.pRedIbs === null ? null : input.pRedIbs.toFixed(10) }
    : {}),
  ...(input.pRedCbs !== undefined
    ? { pRedCbs: input.pRedCbs === null ? null : input.pRedCbs.toFixed(10) }
    : {}),
});

export class MaintainerClassificationIbsCbsService {
  public create(input: CreateClassificationInput, audit: EntityAuditContext) {
    return writer.create({ ...input, ...rates(input) }, audit);
  }

  public async patch(
    id: string,
    input: PatchClassificationInput,
    audit: EntityAuditContext,
  ) {
    const values: Record<string, unknown> = { ...input, ...rates(input) };
    if (
      input.ind_gTribRegular !== undefined ||
      input.cClassTribRegular !== undefined
    ) {
      const [current] = await db
        .select({
          ind_gTribRegular: classificationIbsCbs.ind_gTribRegular,
          cClassTribRegular: classificationIbsCbs.cClassTribRegular,
        })
        .from(classificationIbsCbs)
        .where(eq(classificationIbsCbs.id, id))
        .limit(1);
      if (!current) {
        throw new NotFoundError(
          "Classificacao IBS/CBS nao encontrada",
          "CLASSIFICATION_IBS_CBS_NOT_FOUND",
        );
      }
      const indicator = input.ind_gTribRegular ?? current.ind_gTribRegular;
      if (indicator === "0") {
        if (input.cClassTribRegular) {
          throw new BadRequestError(
            "cClassTribRegular so e aceito quando ind_gTribRegular = 1",
            "C_CLASS_TRIB_REGULAR_NOT_ALLOWED",
          );
        }
        values["cClassTribRegular"] = null;
      } else {
        const code =
          input.cClassTribRegular !== undefined
            ? input.cClassTribRegular
            : current.cClassTribRegular;
        if (!code) {
          throw new BadRequestError(
            "cClassTribRegular e obrigatorio quando ind_gTribRegular = 1",
            "C_CLASS_TRIB_REGULAR_REQUIRED",
          );
        }
      }
    }
    return writer.patch(id, values, audit);
  }

  public delete(id: string, audit: EntityAuditContext) {
    return writer.remove(id, audit);
  }
}

export const maintainerClassificationIbsCbsService =
  new MaintainerClassificationIbsCbsService();
