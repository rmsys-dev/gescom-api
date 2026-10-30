import { anexosRt } from "../../../../db/schema.js";
import { EntityTypes } from "../../../../shared/audit/entity-types.js";
import type { EntityAuditContext } from "../../../../shared/audit/entity-audit.js";
import { createCatalogWriter } from "../catalog-writer.js";
import type { CreateAnexoRtInput, PatchAnexoRtInput } from "./schema.js";

const writer = createCatalogWriter({
  table: anexosRt,
  idColumn: anexosRt.id,
  entityType: EntityTypes.ANEXOS_RT,
  notFoundMessage: "Anexo da reforma tributaria nao encontrado",
  notFoundCode: "ANEXO_RT_NOT_FOUND",
  conflictMessage: "Anexo da reforma tributaria em conflito",
  conflictCode: "ANEXO_RT_CONFLICT",
});

export class MaintainerAnexosRtService {
  public create(input: CreateAnexoRtInput, audit: EntityAuditContext) {
    return writer.create(input, audit);
  }

  public patch(id: string, input: PatchAnexoRtInput, audit: EntityAuditContext) {
    return writer.patch(id, input, audit);
  }

  public delete(id: string, audit: EntityAuditContext) {
    return writer.remove(id, audit);
  }
}

export const maintainerAnexosRtService = new MaintainerAnexosRtService();
