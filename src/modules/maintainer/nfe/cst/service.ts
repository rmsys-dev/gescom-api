import { eq } from "drizzle-orm";
import { db, situationTributaryCst } from "../../../../db/schema.js";
import { EntityTypes } from "../../../../shared/audit/entity-types.js";
import type { EntityAuditContext } from "../../../../shared/audit/entity-audit.js";
import { BadRequestError, NotFoundError } from "../../../../shared/errors/app-error.js";
import { createCatalogWriter } from "../catalog-writer.js";
import {
  cstLengthMessage,
  isCstValidForRegime,
  type CreateCstInput,
  type PatchCstInput,
} from "./schema.js";

const writer = createCatalogWriter({
  table: situationTributaryCst,
  idColumn: situationTributaryCst.id,
  entityType: EntityTypes.SITUATION_TRIBUTARY_CST,
  notFoundMessage: "CST nao encontrado",
  notFoundCode: "CST_NOT_FOUND",
  conflictMessage: "CST em conflito (regime, origem e codigo duplicados)",
  conflictCode: "CST_CONFLICT",
});

export class MaintainerCstService {
  public create(input: CreateCstInput, audit: EntityAuditContext) {
    return writer.create(input, audit);
  }

  public async patch(id: string, input: PatchCstInput, audit: EntityAuditContext) {
    if (input.regimeTributario !== undefined || input.cst !== undefined) {
      const [current] = await db
        .select({
          regimeTributario: situationTributaryCst.regimeTributario,
          cst: situationTributaryCst.cst,
        })
        .from(situationTributaryCst)
        .where(eq(situationTributaryCst.id, id))
        .limit(1);
      if (!current) {
        throw new NotFoundError("CST nao encontrado", "CST_NOT_FOUND");
      }
      const regimeTributario = input.regimeTributario ?? current.regimeTributario;
      const cst = input.cst ?? current.cst;
      if (!isCstValidForRegime(regimeTributario, cst)) {
        throw new BadRequestError(
          cstLengthMessage(regimeTributario),
          "CST_LENGTH_FOR_CRT",
        );
      }
    }
    return writer.patch(id, input, audit);
  }

  public delete(id: string, audit: EntityAuditContext) {
    return writer.remove(id, audit);
  }
}

export const maintainerCstService = new MaintainerCstService();
