import { asc, eq } from "drizzle-orm";
import {
  classificationIbsCbs,
  db,
  nfeOperations,
  presumedCredit,
} from "../../../db/schema.js";
import { BadRequestError, NotFoundError } from "../../../shared/errors/app-error.js";
import { EntityTypes } from "../../../shared/audit/entity-types.js";
import type { EntityAuditContext } from "../../../shared/audit/entity-audit.js";
import { createCatalogWriter } from "../../maintainer/nfe/catalog-writer.js";
import type { CreateNfeOperationInput, PatchNfeOperationInput } from "./schema.js";

const writer = createCatalogWriter({
  table: nfeOperations,
  idColumn: nfeOperations.id,
  entityType: EntityTypes.NFE_OPERATIONS,
  notFoundMessage: "Operacao fiscal nao encontrada",
  notFoundCode: "NFE_OPERATION_NOT_FOUND",
  conflictMessage: "Ja existe uma operacao fiscal com esta descricao",
  conflictCode: "NFE_OPERATION_DUPLICATED",
});

const assertRefs = async (input: {
  classificationIbsCbsId?: string;
  presumedCreditId?: string | null;
}) => {
  if (input.classificationIbsCbsId) {
    const [classification] = await db
      .select({ id: classificationIbsCbs.id })
      .from(classificationIbsCbs)
      .where(eq(classificationIbsCbs.id, input.classificationIbsCbsId))
      .limit(1);
    if (!classification) {
      throw new BadRequestError(
        "Classificacao IBS/CBS nao encontrada",
        "NFE_OPERATION_CLASSIFICATION",
      );
    }
  }
  if (input.presumedCreditId) {
    const [credit] = await db
      .select({ id: presumedCredit.id })
      .from(presumedCredit)
      .where(eq(presumedCredit.id, input.presumedCreditId))
      .limit(1);
    if (!credit) {
      throw new BadRequestError(
        "Credito presumido nao encontrado",
        "NFE_OPERATION_PRESUMED_CREDIT",
      );
    }
  }
};

export class NfeOperationsService {
  public async list() {
    return db
      .select()
      .from(nfeOperations)
      .orderBy(asc(nfeOperations.description), asc(nfeOperations.id));
  }

  public async get(id: string) {
    const [row] = await db
      .select()
      .from(nfeOperations)
      .where(eq(nfeOperations.id, id))
      .limit(1);
    if (!row) {
      throw new NotFoundError(
        "Operacao fiscal nao encontrada",
        "NFE_OPERATION_NOT_FOUND",
      );
    }
    return row;
  }

  public async create(input: CreateNfeOperationInput, audit: EntityAuditContext) {
    await assertRefs(input);
    return writer.create(input, audit);
  }

  public async patch(
    id: string,
    input: PatchNfeOperationInput,
    audit: EntityAuditContext,
  ) {
    await assertRefs(input);
    return writer.patch(id, input, audit);
  }

  public delete(id: string, audit: EntityAuditContext) {
    return writer.remove(id, audit);
  }
}

export const nfeOperationsService = new NfeOperationsService();
