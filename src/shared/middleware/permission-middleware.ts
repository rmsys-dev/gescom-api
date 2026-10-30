import type { NextFunction, Request, RequestHandler, Response } from "express";
import type { PermissionSlug } from "../../modules/auth/default-permissions.js";
import { writeAudit } from "../../modules/auth/audit.js";
import { isAllowed, resolvePermissions } from "../../modules/auth/permissions.js";
import { ForbiddenError } from "../errors/app-error.js";
import type { RequestWithAuth } from "./auth-middleware.js";
import type { RequestWithId } from "./request-id.js";

export const requirePermission = (permission: PermissionSlug): RequestHandler => {
  return requireAnyPermission([permission]);
};

export const requireAnyPermission = (
  permissions: readonly PermissionSlug[],
): RequestHandler => {
  return async (
    req: Request,
    _res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const reqWithAuth = req as RequestWithAuth;
      const reqWithId = req as RequestWithId;

      if (!reqWithAuth.auth?.memberId) {
        await writeAudit({
          event: "PERMISSION_DENIED",
          userId: reqWithAuth.auth?.userId ?? null,
          sessionId: reqWithAuth.auth?.sessionId ?? null,
          enterpriseId: reqWithAuth.auth?.enterpriseId ?? null,
          ipAddress: req.ip ?? null,
          userAgent: req.header("user-agent") ?? null,
          requestId: reqWithId.requestId ?? null,
          reason: "Verificacao de permissao: memberId ausente",
        });
        throw new ForbiddenError(
          "Contexto de membro ausente para verificacao de permissao",
          "MEMBER_CONTEXT_MISSING",
        );
      }

      const resolved = await resolvePermissions(reqWithAuth.auth.memberId);
      const allowed = permissions.some((permission) =>
        isAllowed(resolved, permission),
      );

      if (!allowed) {
        await writeAudit({
          event: "PERMISSION_DENIED",
          userId: reqWithAuth.auth.userId,
          sessionId: reqWithAuth.auth.sessionId,
          enterpriseId: reqWithAuth.auth.enterpriseId ?? null,
          ipAddress: req.ip ?? null,
          userAgent: req.header("user-agent") ?? null,
          requestId: reqWithId.requestId ?? null,
          reason: `Permissao negada: ${permissions.join(" | ")}`,
        });
        throw new ForbiddenError(
          "Permissao negada para esta operacao",
          "PERMISSION_DENIED",
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export const requireSelfOrPermission = (
  permission: PermissionSlug,
  userIdParamName = "userId",
): RequestHandler => {
  const permHandler = requirePermission(permission);
  return (req: Request, res: Response, next: NextFunction): void => {
    const reqAuth = req as RequestWithAuth;
    const targetUserId = req.params[userIdParamName] as string | undefined;
    if (targetUserId !== undefined && reqAuth.auth.userId === targetUserId) {
      next();
      return;
    }
    void permHandler(req, res, next);
  };
};
