import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, enterpriseParameters } from "../../../db/schema.js";
import {
  AUTH_PARAMETERS_TTL_MS,
  authCacheKeys,
} from "../../../shared/cache/auth-cache-invalidation.js";
import { memoryCache } from "../../../shared/cache/memory-cache.js";
import { ForbiddenError } from "../../../shared/errors/app-error.js";
import {
  enterpriseParameterDefaults,
  mergeEnterpriseParameters,
  serializeEnterpriseParameters,
  type EnterpriseParameterSlug,
} from "./catalog.js";

export type ResolvedEnterpriseParameters = Record<
  EnterpriseParameterSlug,
  boolean
>;

/**
 * Resolve parâmetros da empresa a partir da BD com cache em memória (TTL curto).
 * Escopo: empresa inteira, não um membro.
 */
const loadEnterpriseParametersFromDatabase = async (
  enterpriseId: string,
): Promise<ResolvedEnterpriseParameters> => {
  const rows = await db
    .select({
      parameter: enterpriseParameters.parameter,
      enabled: enterpriseParameters.enabled,
    })
    .from(enterpriseParameters)
    .where(
      and(
        eq(enterpriseParameters.enterpriseId, enterpriseId),
        isNull(enterpriseParameters.deletedAt),
      ),
    );

  return serializeEnterpriseParameters(mergeEnterpriseParameters(rows));
};

export const resolveEnterpriseParameters = async (
  enterpriseId: string,
): Promise<ResolvedEnterpriseParameters> =>
  memoryCache.getOrSet(
    authCacheKeys.enterpriseParameters(enterpriseId),
    AUTH_PARAMETERS_TTL_MS,
    () => loadEnterpriseParametersFromDatabase(enterpriseId),
  );

export const resolveEnterpriseParametersMany = async (
  enterpriseIds: readonly string[],
): Promise<Map<string, ResolvedEnterpriseParameters>> => {
  const uniqueIds = [...new Set(enterpriseIds.filter(Boolean))];
  const result = new Map<string, ResolvedEnterpriseParameters>();
  const missingIds: string[] = [];

  for (const id of uniqueIds) {
    const cached = memoryCache.get<ResolvedEnterpriseParameters>(
      authCacheKeys.enterpriseParameters(id),
    );
    if (cached) {
      result.set(id, cached);
    } else {
      missingIds.push(id);
    }
  }

  if (missingIds.length === 0) {
    return result;
  }

  const rows = await db
    .select({
      enterpriseId: enterpriseParameters.enterpriseId,
      parameter: enterpriseParameters.parameter,
      enabled: enterpriseParameters.enabled,
    })
    .from(enterpriseParameters)
    .where(
      and(
        inArray(enterpriseParameters.enterpriseId, missingIds),
        isNull(enterpriseParameters.deletedAt),
      ),
    );

  const grouped = new Map<string, Array<{ parameter: string; enabled: boolean }>>();
  for (const id of missingIds) {
    grouped.set(id, []);
  }
  for (const row of rows) {
    grouped.get(row.enterpriseId)?.push({
      parameter: row.parameter,
      enabled: row.enabled,
    });
  }

  for (const [enterpriseId, enterpriseRows] of grouped) {
    const resolved = serializeEnterpriseParameters(
      mergeEnterpriseParameters(enterpriseRows),
    );
    memoryCache.set(
      authCacheKeys.enterpriseParameters(enterpriseId),
      resolved,
      AUTH_PARAMETERS_TTL_MS,
    );
    result.set(enterpriseId, resolved);
  }

  return result;
};

export const isEnterpriseParameterEnabled = (
  parameters: ResolvedEnterpriseParameters | undefined,
  slug: EnterpriseParameterSlug,
): boolean => {
  if (!parameters) {
    return enterpriseParameterDefaults[slug];
  }
  return parameters[slug] === true;
};

export const assertEnterpriseParameter = (
  resolved: { parameters?: ResolvedEnterpriseParameters },
  slug: EnterpriseParameterSlug,
): void => {
  if (!isEnterpriseParameterEnabled(resolved.parameters, slug)) {
    throw new ForbiddenError(
      "Parâmetro da empresa desabilitado para esta operação",
      "PARAMETER_DISABLED",
    );
  }
};
