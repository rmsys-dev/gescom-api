import type { NextFunction, Request, Response } from "express";
import {
  findMembershipContextByMemberIdForUser,
  findSessionById,
} from "../../modules/auth/repository.js";
import { verifyAccessToken } from "../../modules/auth/tokens.js";
import type { AuthContext } from "../../modules/auth/types.js";
import { UnauthorizedError } from "../errors/app-error.js";

export type RequestWithAuth = Request & { auth: AuthContext };

const extractBearerToken = (req: Request): string | null => {
  const header = req.header("authorization") ?? req.header("Authorization");
  if (!header) {
    return null;
  }
  const [scheme, token] = header.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) {
    return null;
  }
  return token.trim();
};

export const authMiddleware = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const token = extractBearerToken(req);
    if (!token) {
      throw new UnauthorizedError(
        "Token de acesso ausente",
        "MISSING_ACCESS_TOKEN",
      );
    }

    const claims = verifyAccessToken(token);

    const session = await findSessionById(claims.sid);
    if (!session) {
      throw new UnauthorizedError("Sessao invalida", "INVALID_SESSION");
    }
    if (session.revokedAt) {
      throw new UnauthorizedError("Sessao revogada", "SESSION_REVOKED");
    }
    if (session.revokedReason != null) {
      throw new UnauthorizedError("Sessao revogada", "SESSION_REVOKED");
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      throw new UnauthorizedError("Sessao expirada", "SESSION_EXPIRED");
    }
    if (!session.jti) {
      throw new UnauthorizedError("Sessao invalida", "INVALID_SESSION");
    }
    if (
      !session.refreshTokenHash ||
      session.refreshTokenHash === "pending"
    ) {
      throw new UnauthorizedError("Sessao invalida", "INVALID_SESSION");
    }
    if (session.userId !== claims.sub) {
      throw new UnauthorizedError(
        "Sessao nao corresponde ao usuario",
        "SESSION_MISMATCH",
      );
    }
    if (!session.userId) {
      throw new UnauthorizedError("Sessao invalida", "INVALID_SESSION");
    }
    if (!session.memberId || !claims.mem || session.memberId !== claims.mem) {
      throw new UnauthorizedError(
        "Sessao sem empresa selecionada ou com vinculo invalido",
        "MEMBER_CONTEXT_INVALID",
      );
    }

    const memberContext = await findMembershipContextByMemberIdForUser(
      session.memberId,
      session.userId,
    );
    if (!memberContext) {
      throw new UnauthorizedError(
        "Sessao sem vinculo de membro ativo",
        "MEMBER_CONTEXT_INVALID",
      );
    }
    if (claims.ent && claims.ent !== memberContext.enterpriseId) {
      throw new UnauthorizedError(
        "Empresa do token nao corresponde ao vinculo do membro",
        "ENTERPRISE_CONTEXT_INVALID",
      );
    }

    (req as RequestWithAuth).auth = {
      userId: claims.sub,
      sessionId: claims.sid,
      enterpriseId: memberContext.enterpriseId,
      memberId: memberContext.memberId,
      memberDepartmentId: memberContext.memberDepartmentId ?? claims.mdep,
    };

    next();
  } catch (error) {
    next(error);
  }
};
