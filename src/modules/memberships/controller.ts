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
  AddMemberDepartmentInput,
  CreateMembershipInput,
  CreateOnboardMembershipInput,
  InviteMembershipBody,
  ListMembersQuery,
  PatchMemberDepartmentInput,
  PatchMemberDepartmentPermissionInput,
  PatchMembershipInput,
} from "./schema.js";
import {
  auditContextFromAuth,
  auditContextFromPatchAuth,
  auditContextFromPostAuth,
  auditMetaFromRequest,
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

  //Cria um membro com usuário
  public create = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const enterpriseId = req.params["enterpriseId"] as string;
    const body = req.body as CreateMembershipInput;
    const row = await membershipsService.create(
      enterpriseId,
      body,
      reqAuth.auth.userId,
      meta(req),
      membershipPostAudit(req, enterpriseId, "memberships.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Membro criado com sucesso.",
      data: row,
    });
  };

  //Cria um membro com usuário e verifica se ele tem acesso à empresa
  public createOnboard = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const enterpriseId = req.params["enterpriseId"] as string;
    const body = req.body as CreateOnboardMembershipInput;
    const row = await membershipsService.createWithNewUser(
      enterpriseId,
      body,
      reqAuth.auth.userId,
      meta(req),
      membershipPostAudit(req, enterpriseId, "memberships.service.createWithNewUser"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Membro e usuário criados com sucesso.",
      data: row,
    });
  };

  public inviteMembership = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const enterpriseId = req.params["enterpriseId"] as string;
    const body = req.body as InviteMembershipBody;
    const row = await membershipsService.inviteMembership(
      enterpriseId,
      body,
      reqAuth.auth.userId,
      meta(req),
      membershipPostAudit(req, enterpriseId, "memberships.service.inviteMembership"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Convite de membro enviado com sucesso.",
      data: row,
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

  public patchMemberDepartmentPermissionDefault = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const enterpriseId = req.params["enterpriseId"] as string;
    const memberId = req.params["memberId"] as string;
    const departmentId = req.params["departmentId"] as string;
    const body = req.body as PatchMemberDepartmentPermissionInput;

    const row = await membershipsService.patchMemberDepartmentPermissionDefault(
      enterpriseId,
      memberId,
      departmentId,
      body,
      membershipPatchAudit(
        req,
        enterpriseId,
        "memberships.service.patchMemberDepartmentPermissionDefault",
      ),
    );

    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Permissão padrão do departamento atualizada com sucesso.",
      data: row,
    });
  };

  public patchMemberDepartmentPermissionExtra = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const enterpriseId = req.params["enterpriseId"] as string;
    const memberId = req.params["memberId"] as string;
    const departmentId = req.params["departmentId"] as string;
    const body = req.body as PatchMemberDepartmentPermissionInput;

    const row = await membershipsService.patchMemberDepartmentPermissionExtra(
      enterpriseId,
      memberId,
      departmentId,
      body,
      membershipPatchAudit(
        req,
        enterpriseId,
        "memberships.service.patchMemberDepartmentPermissionExtra",
      ),
    );

    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Permissão extra do departamento atualizada com sucesso.",
      data: row,
    });
  };

  //Vincula um membro existente a um novo departamento
  public addDepartment = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const enterpriseId = req.params["enterpriseId"] as string;
    const memberId = req.params["memberId"] as string;
    const body = req.body as AddMemberDepartmentInput;

    const row = await membershipsService.addDepartmentToMember(
      enterpriseId,
      memberId,
      body,
      membershipPostAudit(req, enterpriseId, "memberships.service.addDepartmentToMember"),
    );

    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Departamento vinculado ao membro com sucesso.",
      data: row,
    });
  };

  //Altera um vínculo membro-departamento (soft delete quando `softDelete` é true)
  public patchDepartment = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const enterpriseId = req.params["enterpriseId"] as string;
    const memberId = req.params["memberId"] as string;
    const memberDepartmentId = req.params["memberDepartmentId"] as string;
    const body = req.body as PatchMemberDepartmentInput;

    const row = await membershipsService.patchMemberDepartment(
      enterpriseId,
      memberId,
      memberDepartmentId,
      body,
      membershipPatchAudit(req, enterpriseId, "memberships.service.patchMemberDepartment"),
    );

    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Vínculo membro-departamento atualizado com sucesso.",
      data: row,
    });
  };
}

export const membershipsController = new MembershipsController();
