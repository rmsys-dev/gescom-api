import type { NextFunction, Request, Response } from "express";
import { assertActiveMemberEnterpriseLink } from "../../modules/auth/repository.js";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error.js";
import type { RequestWithAuth } from "./auth-middleware.js";

export const tenantMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reqWithAuth = req as RequestWithAuth;
    if (!reqWithAuth.auth) {
      throw new UnauthorizedError(
        "Contexto de autenticacao ausente",
        "AUTH_CONTEXT_MISSING",
      );
    }

    const { memberId, enterpriseId, userId } = reqWithAuth.auth;
    if (!memberId) {
      throw new ForbiddenError(
        "Selecione uma empresa antes de acessar este recurso",
        "ENTERPRISE_NOT_SELECTED",
      );
    }

    if (!enterpriseId) {
      throw new ForbiddenError(
        "Contexto de empresa ausente para esta operacao",
        "TENANT_SCOPE_REQUIRED",
      );
    }

    const routeEnterpriseId = req.params["enterpriseId"];
    if (routeEnterpriseId && enterpriseId !== routeEnterpriseId) {
      throw new ForbiddenError(
        "Empresa nao corresponde ao vinculo do usuario",
        "ENTERPRISE_MISMATCH",
      );
    }

    const ok = await assertActiveMemberEnterpriseLink({
      userId,
      memberId,
      enterpriseId,
    });
    if (!ok) {
      throw new ForbiddenError(
        "Vinculo com empresa invalido ou inativo",
        "MEMBERSHIP_TENANT_INVALID",
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
