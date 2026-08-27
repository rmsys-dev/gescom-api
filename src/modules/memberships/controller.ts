import type { Request, Response } from "express";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithAuth } from "../../shared/middleware/auth-middleware.js";
import type { RequestWithId } from "../../shared/middleware/request-id.js";
import type { RequestWithValidatedQuery } from "../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../shared/responses/send-success-response.js";
import type {
  AddMemberModuleInput,
  CreateMembershipInput,
  CreateOnboardMembershipInput,
  ListMembersQuery,
  PatchMemberModuleInput,
  PatchMemberModulePermissionInput,
  PatchMembershipInput,
} from "./schema.js";
import {
  auditContextFromPatchAuth,
  auditContextFromPostAuth,
} from "../../shared/audit/request-meta.js";
import { membershipsService } from "./service.js";

const meta = (req: Request) => ({
  ipAddress: req.ip ?? null,
  userAgent: req.header("user-agent") ?? null,
  requestId: (req as RequestWithId).requestId ?? null,
});

const membershipPostAudit = (
  req: Request,
  enterpriseId: string,
  source: string,
) => {
  const reqAuth = req as RequestWithAuth;
  return auditContextFromPostAuth(reqAuth.auth, req, source, { enterpriseId });
};

const membershipPatchAudit = (
  req: Request,
  enterpriseId: string,
  source: string,
) => {
  const reqAuth = req as RequestWithAuth;
  return auditContextFromPatchAuth(reqAuth.auth, req, source, { enterpriseId });
};

export class MembershipsController {
  //Listagem de membros da empresa
  public list = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = req.params["enterpriseId"] as string;
    const query = (req as RequestWithValidatedQuery<ListMembersQuery>)
      .validatedQuery;
    const page = await membershipsService.list(enterpriseId, query);
    sendPageFromService(res, HttpStatus.OK, "Membros listados com sucesso.", page);
  };

  //Detalhe de membro por ID
  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = req.params["enterpriseId"] as string;
    const memberId = req.params["memberId"] as string;
    const row = await membershipsService.getById(enterpriseId, memberId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Membro recuperado com sucesso.",
      data: row,
    });
  };

  //Detalhe de membro por código
  public getByCode = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = req.params["enterpriseId"] as string;
    const code = Number(req.params["code"]);
    const row = await membershipsService.getByCode(enterpriseId, code);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Membro recuperado com sucesso.",
      data: row,
    });
  };

  /** Vínculo a utilizador já existente (POST /members). */
  public create = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const enterpriseId = req.params["enterpriseId"] as string;
    const body = req.body as CreateMembershipInput;
    const row = await membershipsService.createMembership(
      enterpriseId,
      body,
      reqAuth.auth.userId,
      membershipPostAudit(req, enterpriseId, "memberships.service.createMembership"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Membro criado com sucesso.",
      data: row,
    });
  };

  /**
   * create-with-user: cria utilizador+membro ou, se CPF/e-mail/telefone já existirem,
   * apenas o vínculo PENDENTE (linkedExistingUser).
   */
  public createOnboard = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const enterpriseId = req.params["enterpriseId"] as string;
    const body = req.body as CreateOnboardMembershipInput;
    const row = await membershipsService.createWithNewUser(
      enterpriseId,
      body,
      reqAuth.auth.userId,
      membershipPostAudit(req, enterpriseId, "memberships.service.createWithNewUser"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: row.linkedExistingUser
        ? "Usuario encontrado. Membro vinculado com sucesso."
        : "Membro e usuário criados com sucesso.",
      data: row,
    });
  };

  //Aprova cadastro de membro (PENDENTE → ATIVO; e-mails após aprovação excepto CLIENTE)
  public approve = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const enterpriseId = req.params["enterpriseId"] as string;
    const memberId = req.params["memberId"] as string;
    const result = await membershipsService.approveMembership(
      enterpriseId,
      memberId,
      reqAuth.auth.userId,
      meta(req),
      membershipPatchAudit(req, enterpriseId, "memberships.service.approveMembership"),
    );
    const emailSuffix =
      result.emailSent === "FIRST_ACCESS"
        ? " E-mail de primeiro acesso enviado."
        : result.emailSent === "MEMBERSHIP_ACCEPT"
          ? " E-mail de convite enviado."
          : "";
    sendSuccessResponse(res, HttpStatus.OK, {
      message: `Membro aprovado com sucesso.${emailSuffix}`,
      data: result.member,
    });
  };

  //Altera um membro da empresa (soft delete quando `softDelete` é true)
  public patch = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const enterpriseId = req.params["enterpriseId"] as string;
    const memberId = req.params["memberId"] as string;
    const body = req.body as PatchMembershipInput;

    const row = await membershipsService.patch(
      enterpriseId,
      memberId,
      body,
      reqAuth.auth,
      membershipPatchAudit(req, enterpriseId, "memberships.service.patch"),
    );

    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Membro atualizado com sucesso.",
      data: row,
    });
  };

  public patchModulePermission = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const enterpriseId = req.params["enterpriseId"] as string;
    const memberId = req.params["memberId"] as string;
    const memberModuleId = req.params["memberModuleId"] as string;
    const permission = req.params["permission"] as string;
    const body = req.body as PatchMemberModulePermissionInput;

    const row = await membershipsService.patchMemberModulePermission(
      enterpriseId,
      memberId,
      memberModuleId,
      permission,
      body.status,
      reqAuth.auth.memberId ?? null,
      membershipPatchAudit(
        req,
        enterpriseId,
        "memberships.service.patchMemberModulePermission",
      ),
    );

    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Permissao do membro atualizada com sucesso.",
      data: row,
    });
  };

  public addModule = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const enterpriseId = req.params["enterpriseId"] as string;
    const memberId = req.params["memberId"] as string;
    const body = req.body as AddMemberModuleInput;

    const row = await membershipsService.addModuleToMember(
      enterpriseId,
      memberId,
      body,
      reqAuth.auth.memberId ?? null,
      membershipPostAudit(req, enterpriseId, "memberships.service.addModuleToMember"),
    );

    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Modulo vinculado ao membro com sucesso.",
      data: row,
    });
  };

  public patchModule = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const enterpriseId = req.params["enterpriseId"] as string;
    const memberId = req.params["memberId"] as string;
    const memberModuleId = req.params["memberModuleId"] as string;
    const body = req.body as PatchMemberModuleInput;

    const row = await membershipsService.patchMemberModule(
      enterpriseId,
      memberId,
      memberModuleId,
      body,
      reqAuth.auth.memberId ?? null,
      membershipPatchAudit(req, enterpriseId, "memberships.service.patchMemberModule"),
    );

    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Vinculo membro-modulo atualizado com sucesso.",
      data: row,
    });
  };
}

export const membershipsController = new MembershipsController();
