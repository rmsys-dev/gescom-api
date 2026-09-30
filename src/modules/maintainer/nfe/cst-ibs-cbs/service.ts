import { cstIbsCbs } from "../../../../db/schema.js";
import { EntityTypes } from "../../../../shared/audit/entity-types.js";
import type { EntityAuditContext } from "../../../../shared/audit/entity-audit.js";
import { createCatalogWriter } from "../catalog-writer.js";
import type { CreateCstIbsCbsInput, PatchCstIbsCbsInput } from "./schema.js";

const writer = createCatalogWriter({
  table: cstIbsCbs,
  idColumn: cstIbsCbs.id,
  entityType: EntityTypes.CST_IBS_CBS,
  notFoundMessage: "CST IBS/CBS nao encontrado",
  notFoundCode: "CST_IBS_CBS_NOT_FOUND",
  conflictMessage: "CST IBS/CBS em conflito (codigo duplicado)",
  conflictCode: "CST_IBS_CBS_CONFLICT",
});

export class MaintainerCstIbsCbsService {
  public create(input: CreateCstIbsCbsInput, audit: EntityAuditContext) {
    return writer.create(input, audit);
  }

  public patch(
    id: string,
    input: PatchCstIbsCbsInput,
    audit: EntityAuditContext,
  ) {
    return writer.patch(id, input, audit);
  }

  public delete(id: string, audit: EntityAuditContext) {
    return writer.remove(id, audit);
  }
}

export const maintainerCstIbsCbsService = new MaintainerCstIbsCbsService();
