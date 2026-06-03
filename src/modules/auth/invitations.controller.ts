import type { Request, Response } from "express";
import { HttpStatus } from "../../shared/http/http-status.js";
import { ForbiddenError } from "../../shared/errors/app-error.js";
import type { RequestWithAuth } from "../../shared/middleware/auth-middleware.js";
import type { RequestWithId } from "../../shared/middleware/request-id.js";
import { sendSuccessResponse } from "../../shared/responses/send-success-response.js";
import type {
  InvitationAcceptPublicInput,
  InvitationDeclineInput,
} from "./schema.js";
import {
  acceptMembershipInvitationPublic,
  declineMembershipInvitation,
  resendMembershipInvitation,
} from "./invitations.service.js";

const meta = (req: Request) => ({
  ipAddress: req.ip ?? null,
  userAgent: req.header("user-agent") ?? null,
  requestId: (req as RequestWithId).requestId ?? null,
});

export class MembershipInvitationsController {
  public accept = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as InvitationAcceptPublicInput;
    const memberId = req.params["memberId"] as string;
    const response = await acceptMembershipInvitationPublic({
      memberId,
      loginType: body.loginType,
      login: body.login,
      password: body.password,
      code: body.code,
      ...meta(req),
    });
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Convite aceito com sucesso.",
      data: response,
    });
  };

  public decline = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const sessionEnterpriseId = reqAuth.auth.enterpriseId;
    if (!sessionEnterpriseId) {
      throw new ForbiddenError(
        "Contexto de empresa ausente para esta operacao",
        "TENANT_SCOPE_REQUIRED",
      );
    }
    const body = req.body as InvitationDeclineInput;
    const memberId = req.params["memberId"] as string;
    await declineMembershipInvitation({
      memberId,
      actorUserId: reqAuth.auth.userId,
      sessionEnterpriseId,
      reason: body.reason ?? null,
      ...meta(req),
    });
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Convite recusado com sucesso.",
      data: null,
    });
  };

  public resend = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const sessionEnterpriseId = reqAuth.auth.enterpriseId;
    if (!sessionEnterpriseId) {
      throw new ForbiddenError(
        "Contexto de empresa ausente para esta operacao",
        "TENANT_SCOPE_REQUIRED",
      );
    }
    const memberId = req.params["memberId"] as string;
    await resendMembershipInvitation({
      memberId,
      actorUserId: reqAuth.auth.userId,
      sessionEnterpriseId,
      actorMemberDepartmentId: reqAuth.auth.memberDepartmentId ?? null,
      ...meta(req),
    });
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Convite reenviado com sucesso.",
      data: null,
    });
  };
}
