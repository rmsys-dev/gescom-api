import type { Request, Response } from "express";
import { requireTenantEnterpriseId } from "../../shared/controllers/tenant-context.js";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithAuth } from "../../shared/middleware/auth-middleware.js";
import type { RequestWithUserReadAccess } from "../../shared/middleware/user-read-access-middleware.js";
import type { RequestWithValidatedQuery } from "../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../shared/responses/send-success-response.js";
import type {
  CreateUserBody,
  ListUsersQuery,
  PatchUserBody,
} from "./schema.js";
import {
  auditContextFromAuth,
  auditContextFromPostAuth,
  auditMetaFromRequest,
} from "../../shared/audit/request-meta.js";
import { usersService } from "./service.js";

export class UsersController {
  //Cria um usuário
  public create = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const body = req.body as CreateUserBody;
    const enterpriseId = requireTenantEnterpriseId(reqAuth.auth);
    const row = await usersService.createUser(
      body,
      enterpriseId,
      auditContextFromPostAuth(
        reqAuth.auth,
        req,
        "users.service.createUser",
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Usuário criado com sucesso.",
      data: row,
    });
  };

  //Lista usuários (cadastro global; acesso controlado por permissão)
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListUsersQuery>)
      .validatedQuery;
    const page = await usersService.findMany(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Usuários listados com sucesso.",
      page,
    );
  };

  //Busca um usuário pelo ID
  public getById = async (req: Request, res: Response): Promise<void> => {
    const reqWithRead = req as RequestWithUserReadAccess;
    const { targetUserId, readMode } = reqWithRead.userReadAccess;
    const enterpriseId = reqWithRead.auth.enterpriseId ?? "";
    const row = await usersService.getByIdForRequester(
      targetUserId,
      readMode,
      enterpriseId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Usuário recuperado com sucesso.",
      data: row,
    });
  };

  //Altera parcialmente um usuário
  public patch = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const userId = req.params["userId"] as string;
    const body = req.body as PatchUserBody;
    const enterpriseId = requireTenantEnterpriseId(reqAuth.auth);
    const row = await usersService.patchUser(
      userId,
      body,
      enterpriseId,
      auditContextFromAuth(
        reqAuth.auth,
        auditMetaFromRequest(req),
        "users.service.patchUser",
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Usuário atualizado com sucesso.",
      data: row,
    });
  };
}

export const usersController = new UsersController();
