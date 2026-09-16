import { resolveEnterpriseParametersMany } from "../enterprises/parameters/resolve.js";
import { serializeEnterpriseParameters } from "../enterprises/parameters/catalog.js";
export const mapEnterprises = async (rows) => {
    const parametersByEnterprise = await resolveEnterpriseParametersMany(rows.map((row) => row.enterpriseId));
    return rows.map((row) => ({
        id: row.enterpriseId,
        registration: row.enterpriseRegistration,
        tradeName: row.enterpriseTradeName,
        legalName: row.enterpriseLegalName,
        memberId: row.memberId,
        class: row.class,
        parameters: parametersByEnterprise.get(row.enterpriseId) ??
            serializeEnterpriseParameters({}),
    }));
};
export const mapAuthUser = (user) => ({
    id: user.id,
    name: user.userName,
    email: user.userEmail ?? null,
    registration: user.userRegistration ?? null,
    onboardingCompleted: user.onboardingCompleted,
});
