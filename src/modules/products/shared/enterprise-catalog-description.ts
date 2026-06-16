import { and, eq, ne } from "drizzle-orm";
import { db } from "../../../db/index.js";
import {
  productBrands,
  productGroups,
  productSubgroups,
} from "../../../db/schema.js";
import { ConflictError } from "../../../shared/errors/app-error.js";
import { normalizeUppercaseCode } from "../../../shared/validation/data-normalizers.js";

export const normalizeEnterpriseCatalogDescription = (value: string): string =>
  normalizeUppercaseCode(value).replace(/\s+/g, " ");

type EnterpriseCatalogTable =
  | typeof productGroups
  | typeof productBrands
  | typeof productSubgroups;

export const assertEnterpriseCatalogDescriptionAvailable = async (params: {
  table: EnterpriseCatalogTable;
  enterpriseId: string;
  description: string;
  excludeId?: string;
  conflictCode: string;
  message: string;
}): Promise<string> => {
  const normalized = normalizeEnterpriseCatalogDescription(params.description);
  const { table, enterpriseId, excludeId, conflictCode, message } = params;
  const conditions = [
    eq(table.enterprisesId, enterpriseId),
    eq(table.description, normalized),
  ];
  if (excludeId) {
    conditions.push(ne(table.id, excludeId));
  }

  const existing = await db
    .select({ id: table.id })
    .from(table)
    .where(and(...conditions))
    .limit(1);

  if (existing[0]) {
    throw new ConflictError(message, conflictCode);
  }

  return normalized;
};
