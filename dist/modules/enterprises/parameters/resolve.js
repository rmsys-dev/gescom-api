import { and, eq, inArray, isNull } from "drizzle-orm";
import { db, enterpriseParameters } from "../../../db/schema.js";
import { ForbiddenError } from "../../../shared/errors/app-error.js";
import { enterpriseParameterDefaults, mergeEnterpriseParameters, serializeEnterpriseParameters, } from "./catalog.js";
/**
 * Resolve parâmetros da empresa a partir da BD.
 * Escopo: empresa inteira, não um membro.
 */
export const resolveEnterpriseParameters = async (enterpriseId) => {
    const rows = await db
        .select({
        parameter: enterpriseParameters.parameter,
        enabled: enterpriseParameters.enabled,
    })
        .from(enterpriseParameters)
        .where(and(eq(enterpriseParameters.enterpriseId, enterpriseId), isNull(enterpriseParameters.deletedAt)));
    return serializeEnterpriseParameters(mergeEnterpriseParameters(rows));
};
export const resolveEnterpriseParametersMany = async (enterpriseIds) => {
    const uniqueIds = [...new Set(enterpriseIds.filter(Boolean))];
    const result = new Map();
    if (uniqueIds.length === 0) {
        return result;
    }
    const rows = await db
        .select({
        enterpriseId: enterpriseParameters.enterpriseId,
        parameter: enterpriseParameters.parameter,
        enabled: enterpriseParameters.enabled,
    })
        .from(enterpriseParameters)
        .where(and(inArray(enterpriseParameters.enterpriseId, uniqueIds), isNull(enterpriseParameters.deletedAt)));
    const grouped = new Map();
    for (const id of uniqueIds) {
        grouped.set(id, []);
    }
    for (const row of rows) {
        grouped.get(row.enterpriseId)?.push({
            parameter: row.parameter,
            enabled: row.enabled,
        });
    }
    for (const [enterpriseId, enterpriseRows] of grouped) {
        result.set(enterpriseId, serializeEnterpriseParameters(mergeEnterpriseParameters(enterpriseRows)));
    }
    return result;
};
export const isEnterpriseParameterEnabled = (parameters, slug) => {
    if (!parameters) {
        return enterpriseParameterDefaults[slug];
    }
    return parameters[slug] === true;
};
export const isEnterpriseParameterEnabledFor = async (enterpriseId, slug) => {
    const parameters = await resolveEnterpriseParameters(enterpriseId);
    return isEnterpriseParameterEnabled(parameters, slug);
};
export const assertEnterpriseParameter = (resolved, slug) => {
    if (!isEnterpriseParameterEnabled(resolved.parameters, slug)) {
        throw new ForbiddenError("Parâmetro da empresa desabilitado para esta operação", "PARAMETER_DISABLED");
    }
};
