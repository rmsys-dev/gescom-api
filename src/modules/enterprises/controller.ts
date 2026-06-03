import type { Request, Response } from "express";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithAuth } from "../../shared/middleware/auth-middleware.js";
import type { RequestWithValidatedQuery } from "../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../shared/responses/send-success-response.js";
import type { ListEnterprisesQuery, PatchEnterpriseInput } from "./schema.js";
import { auditContextFromRequest } from "../../shared/audit/request-meta.js";
import { enterprisesService } from "./service.js";

export class EnterprisesController {
  //Listagem de empresas
  public list = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const query = (req as RequestWithValidatedQuery<ListEnterprisesQuery>)
      .validatedQuery;
    const page = await enterprisesService.listForAuthenticatedUser(
      reqAuth.auth.userId,
      query,
    );
    sendPageFromService(res, HttpStatus.OK, "Empresas listadas com sucesso.", page);
  };

  //Busca uma empresa por ID
  public getById = async (req: Request, res: Response): Promise<void> => {
    const id = req.params["enterpriseId"] as string;
    const row = await enterprisesService.getById(id);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Empresa recuperada com sucesso.",
      data: row,
    });
  };

  //Altera uma empresa
  public patch = async (req: Request, res: Response): Promise<void> => {
    const id = req.params["enterpriseId"] as string;
    const body = req.body as PatchEnterpriseInput;
    const row = await enterprisesService.patch(
      id,
      body,
      auditContextFromRequest(req, "enterprises.service.patch", {
        enterpriseId: id,
      }),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Empresa atualizada com sucesso.",
      data: row,
    });
  };
}

export const enterprisesController = new EnterprisesController();
