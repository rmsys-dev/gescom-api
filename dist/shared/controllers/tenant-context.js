import { ForbiddenError } from "../errors/app-error.js";
/** Garante enterpriseId após `tenantMiddleware` (ou rotas equivalentes). */
export const requireTenantEnterpriseId = (auth) => {
    const { enterpriseId } = auth;
    if (!enterpriseId) {
        throw new ForbiddenError("Contexto de empresa ausente para a operacao", "TENANT_SCOPE_REQUIRED");
    }
    return enterpriseId;
};
