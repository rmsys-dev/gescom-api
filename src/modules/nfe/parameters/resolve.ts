import { isNull } from "drizzle-orm";
import { db, nfeParameters } from "../../../db/schema.js";
import {
  mergeNfeParameters,
  nfeParameterDefaults,
  serializeNfeParameters,
  type NfeParameterSlug,
} from "./catalog.js";

export type ResolvedNfeParameters = Record<NfeParameterSlug, string>;

export const resolveNfeParameters = async (): Promise<ResolvedNfeParameters> => {
  const rows = await db
    .select({
      parameter: nfeParameters.parameter,
      value: nfeParameters.value,
    })
    .from(nfeParameters)
    .where(isNull(nfeParameters.deletedAt));

  return serializeNfeParameters(mergeNfeParameters(rows));
};

export const getNfeParameter = async (
  slug: NfeParameterSlug,
): Promise<string> => {
  const resolved = await resolveNfeParameters();
  return resolved[slug] ?? nfeParameterDefaults[slug];
};
