import { isEnterpriseParameterEnabled, resolveEnterpriseParameters, } from "../../modules/enterprises/parameters/resolve.js";
import { ForbiddenError } from "../errors/app-error.js";
/**
 * Gate de parâmetro de empresa, análogo a `requirePermission`.
 */
export const requireParameter = (parameter) => {
    return async (req, _res, next) => {
        try {
            const reqWithAuth = req;
            const enterpriseId = reqWithAuth.auth?.enterpriseId;
            if (!enterpriseId) {
                throw new ForbiddenError("Contexto de empresa ausente para verificacao de parametro", "ENTERPRISE_CONTEXT_MISSING");
            }
            const parameters = await resolveEnterpriseParameters(enterpriseId);
            if (!isEnterpriseParameterEnabled(parameters, parameter)) {
                throw new ForbiddenError("Parametro da empresa desabilitado para esta operacao", "PARAMETER_DISABLED");
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
