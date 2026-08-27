import type { NextFunction, Request, RequestHandler, Response } from "express";
import { PERM } from "../../modules/auth/default-permissions.js";
import { isAllowed, resolvePermissions } from "../../modules/auth/permissions.js";
import { NotFoundError } from "../errors/app-error.js";
import type { RequestWithAuth } from "./auth-middleware.js";

export type UserGetByIdReadMode = "self" | "directory";

export type RequestWithUserReadAccess = RequestWithAuth & {
  userReadAccess: { targetUserId: string; readMode: UserGetByIdReadMode };
};

export const resolveUserReadAccess: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reqWithAuth = req as RequestWithAuth;
    const targetUserId = req.params["userId"] as string;

    if (reqWithAuth.auth.userId === targetUserId) {
      (req as RequestWithUserReadAccess).userReadAccess = {
        targetUserId,
        readMode: "self",
      };
      next();
      return;
    }

    const memberId = reqWithAuth.auth.memberId;
    const enterpriseId = reqWithAuth.auth.enterpriseId;
    if (!memberId || !enterpriseId) {
      throw new NotFoundError("Usuario nao encontrado", "USER_NOT_FOUND");
    }

    const resolved = await resolvePermissions(memberId);

    if (isAllowed(resolved, PERM.consultar_usuarios)) {
      (req as RequestWithUserReadAccess).userReadAccess = {
        targetUserId,
        readMode: "directory",
      };
      next();
      return;
    }

    throw new NotFoundError("Usuario nao encontrado", "USER_NOT_FOUND");
  } catch (error) {
    next(error);
  }
};
