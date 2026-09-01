import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { EnterpriseParameterSlug } from "../../modules/enterprises/parameters/catalog.js";
import {
  isEnterpriseParameterEnabled,
  resolveEnterpriseParameters,
} from "../../modules/enterprises/parameters/resolve.js";
import { ForbiddenError } from "../errors/app-error.js";
import type { RequestWithAuth } from "./auth-middleware.js";

/**
 * Gate de parâmetro de empresa, análogo a `requirePermission`.
 * Usa cache em memória de `resolveEnterpriseParameters` (invalidado em mutações).
 */
export const requireParameter = (
  parameter: EnterpriseParameterSlug,
): RequestHandler => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const reqWithAuth = req as RequestWithAuth;
      const enterpriseId = reqWithAuth.auth?.enterpriseId;
      if (!enterpriseId) {
        throw new ForbiddenError(
          "Contexto de empresa ausente para verificacao de parametro",
          "ENTERPRISE_CONTEXT_MISSING",
        );
      }

      const parameters = await resolveEnterpriseParameters(enterpriseId);
      if (!isEnterpriseParameterEnabled(parameters, parameter)) {
        throw new ForbiddenError(
          "Parametro da empresa desabilitado para esta operacao",
          "PARAMETER_DISABLED",
        );
      }
      next();
    } catch (error) {
      next(error);
    }
  };
};
