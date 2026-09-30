import { presumedCredit } from "../../../../db/schema.js";
import { EntityTypes } from "../../../../shared/audit/entity-types.js";
import type { EntityAuditContext } from "../../../../shared/audit/entity-audit.js";
import { createCatalogWriter } from "../catalog-writer.js";
import type {
  CreatePresumedCreditInput,
  PatchPresumedCreditInput,
} from "./schema.js";

const writer = createCatalogWriter({
  table: presumedCredit,
  idColumn: presumedCredit.id,
  entityType: EntityTypes.PRESUMED_CREDIT,
  notFoundMessage: "Credito presumido nao encontrado",
  notFoundCode: "PRESUMED_CREDIT_NOT_FOUND",
  conflictMessage: "Credito presumido em conflito (cCredPres duplicado)",
  conflictCode: "PRESUMED_CREDIT_CONFLICT",
});

export class MaintainerPresumedCreditService {
  public create(input: CreatePresumedCreditInput, audit: EntityAuditContext) {
    return writer.create(input, audit);
  }

  public patch(
    id: string,
    input: PatchPresumedCreditInput,
    audit: EntityAuditContext,
  ) {
    return writer.patch(id, input, audit);
  }

  public delete(id: string, audit: EntityAuditContext) {
    return writer.remove(id, audit);
  }
}

export const maintainerPresumedCreditService = new MaintainerPresumedCreditService();
