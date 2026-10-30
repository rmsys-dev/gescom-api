import { cfops } from "../../../../db/schema.js";
import { EntityTypes } from "../../../../shared/audit/entity-types.js";
import { createCatalogWriter } from "../catalog-writer.js";
import type { CreateCfopInput, PatchCfopInput } from "./schema.js";
import type { EntityAuditContext } from "../../../../shared/audit/entity-audit.js";

const writer = createCatalogWriter({
  table: cfops,
  idColumn: cfops.id,
  entityType: EntityTypes.CFOPS,
  notFoundMessage: "CFOP nao encontrado",
  notFoundCode: "CFOP_NOT_FOUND",
  conflictMessage: "CFOP em conflito (codigo duplicado)",
  conflictCode: "CFOP_CONFLICT",
});

export class MaintainerCfopsService {
  public create(input: CreateCfopInput, audit: EntityAuditContext) {
    return writer.create(input, audit);
  }

  public patch(id: string, input: PatchCfopInput, audit: EntityAuditContext) {
    return writer.patch(id, input, audit);
  }

  public delete(id: string, audit: EntityAuditContext) {
    return writer.remove(id, audit);
  }
}

export const maintainerCfopsService = new MaintainerCfopsService();
