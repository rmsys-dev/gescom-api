import type { NextFunction, Request, RequestHandler, Response } from "express";
import { PERM } from "../../modules/auth/default-permissions.js";
import { writeAudit } from "../../modules/auth/audit.js";
import { isAllowed, resolvePermissions } from "../../modules/auth/permissions.js";
import { findPrimaryMemberDepartmentIdByMemberId } from "../../modules/auth/repository.js";
import { ForbiddenError } from "../errors/app-error.js";
import type { RequestWithAuth } from "./auth-middleware.js";
import type { RequestWithId } from "./request-id.js";
import { findDepartmentIdForMemberDepartment } from "../../modules/departments/repository.js";

/** Escopo de linha para operações de departamento na empresa da sessão. */
export type DepartmentRowScope = { scopedDepartmentId?: string };

export type RequestWithDepartmentScope = RequestWithAuth & {
  departmentScope: DepartmentRowScope;
};

/**
 * Após auth + tenant (+ requirePermission quando aplicável): define se o membro
 * enxerga todos os departamentos da empresa ou apenas o do seu vínculo principal.
 */
export const resolveDepartmentScope: RequestHandler = async (
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    const reqWithAuth = req as RequestWithAuth;
    const reqWithId = req as RequestWithId;
    const enterpriseId = req.params["enterpriseId"] as string | undefined;
    if (!enterpriseId) {
      await writeAudit({
        event: "PERMISSION_DENIED",
        userId: reqWithAuth.auth?.userId ?? null,
        sessionId: reqWithAuth.auth?.sessionId ?? null,
        enterpriseId: reqWithAuth.auth?.enterpriseId ?? null,
        ipAddress: req.ip ?? null,
        userAgent: req.header("user-agent") ?? null,
        requestId: reqWithId.requestId ?? null,
        reason: "Escopo departamento: enterpriseId ausente na rota",
      });
      throw new ForbiddenError(
        "Contexto de empresa ausente na rota",
        "ENTERPRISE_CONTEXT_MISSING",
      );
    }

    if (!reqWithAuth.auth?.memberId) {
      await writeAudit({
        event: "PERMISSION_DENIED",
        userId: reqWithAuth.auth?.userId ?? null,
        sessionId: reqWithAuth.auth?.sessionId ?? null,
        enterpriseId: reqWithAuth.auth?.enterpriseId ?? null,
        ipAddress: req.ip ?? null,
        userAgent: req.header("user-agent") ?? null,
        requestId: reqWithId.requestId ?? null,
        reason: "Escopo departamento: memberId ausente",
      });
      throw new ForbiddenError(
        "Contexto de membro ausente para esta operacao",
        "MEMBER_CONTEXT_MISSING",
      );
    }

    let memberDepartmentId = reqWithAuth.auth.memberDepartmentId;
    if (!memberDepartmentId) {
      memberDepartmentId =
        (await findPrimaryMemberDepartmentIdByMemberId(
          reqWithAuth.auth.memberId,
        )) ?? undefined;
    }

    if (!memberDepartmentId) {
      await writeAudit({
        event: "PERMISSION_DENIED",
        userId: reqWithAuth.auth.userId,
        sessionId: reqWithAuth.auth.sessionId,
        enterpriseId: reqWithAuth.auth.enterpriseId ?? null,
        ipAddress: req.ip ?? null,
        userAgent: req.header("user-agent") ?? null,
        requestId: reqWithId.requestId ?? null,
        reason: "Escopo departamento: departamento principal ausente",
      });
      throw new ForbiddenError(
        "Departamento principal do usuario nao definido",
        "MEMBER_DEPARTMENT_MISSING",
      );
    }

    const resolved = await resolvePermissions(memberDepartmentId);
    if (isAllowed(resolved, PERM.consultar_departamentos)) {
      (req as RequestWithDepartmentScope).departmentScope = {};
      next();
      return;
    }

    const memberId = reqWithAuth.auth.memberId;

    const departmentId = await findDepartmentIdForMemberDepartment({
      memberDepartmentId,
      memberId,
      enterpriseId,
    });

    if (!departmentId) {
      await writeAudit({
        event: "PERMISSION_DENIED",
        userId: reqWithAuth.auth.userId,
        sessionId: reqWithAuth.auth.sessionId,
        enterpriseId: reqWithAuth.auth.enterpriseId ?? null,
        ipAddress: req.ip ?? null,
        userAgent: req.header("user-agent") ?? null,
        requestId: reqWithId.requestId ?? null,
        reason: "Escopo departamento: vinculo invalido na empresa",
      });
      throw new ForbiddenError(
        "Vinculo de departamento invalido para esta empresa",
        "MEMBER_DEPARTMENT_INVALID",
      );
    }

    (req as RequestWithDepartmentScope).departmentScope = {
      scopedDepartmentId: departmentId,
    };
    next();
  } catch (error) {
    next(error);
  }
};
