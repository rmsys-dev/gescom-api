import { fiscalDocumentModels } from "../../../../db/schema.js";
import { EntityTypes } from "../../../../shared/audit/entity-types.js";
import { createCatalogWriter } from "../catalog-writer.js";
import type { CreateDocumentModelInput, PatchDocumentModelInput } from "./schema.js";
import type { EntityAuditContext } from "../../../../shared/audit/entity-audit.js";

const writer = createCatalogWriter({
  table: fiscalDocumentModels,
  idColumn: fiscalDocumentModels.id,
  entityType: EntityTypes.FISCAL_DOCUMENT_MODELS,
  notFoundMessage: "Modelo de documento nao encontrado",
  notFoundCode: "DOCUMENT_MODEL_NOT_FOUND",
  conflictMessage: "Modelo de documento em conflito (codigo duplicado)",
  conflictCode: "DOCUMENT_MODEL_CONFLICT",
});

export class MaintainerDocumentModelsService {
  public create(input: CreateDocumentModelInput, audit: EntityAuditContext) {
    return writer.create(input, audit);
  }

  public patch(id: string, input: PatchDocumentModelInput, audit: EntityAuditContext) {
    return writer.patch(id, input, audit);
  }

  public delete(id: string, audit: EntityAuditContext) {
    return writer.remove(id, audit);
  }
}

export const maintainerDocumentModelsService = new MaintainerDocumentModelsService();
