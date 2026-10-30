import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import type { CreateEnterpriseInput } from "./schema.js";
import type { PatchEnterpriseParametersInput } from "../../enterprises/parameters/schema.js";
import {
  auditContextFromPostAuth,
  auditContextFromRequest,
} from "../../../shared/audit/request-meta.js";
import { maintainerEnterprisesService } from "./service.js";

export class MaintainerEnterprisesController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateEnterpriseInput;
    const auth = (req as RequestWithAuth).auth;
    const row = await maintainerEnterprisesService.create(
      body,
      auth.userId,
      auditContextFromPostAuth(
        auth,
        req,
        "maintainer.enterprises.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Empresa criada com sucesso.",
      data: row,
    });
  };

  public patchParameters = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const id = req.params["enterpriseId"] as string;
    const body = req.body as PatchEnterpriseParametersInput;
    const data = await maintainerEnterprisesService.patchParameters(
      id,
      body,
      auditContextFromRequest(
        req,
        "maintainer.enterprises.service.patchParameters",
        { enterpriseId: id },
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Parametros da empresa atualizados com sucesso.",
      data,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const id = req.params["enterpriseId"] as string;
    const row = await maintainerEnterprisesService.softDelete(
      id,
      auditContextFromRequest(
        req,
        "maintainer.enterprises.service.softDelete",
        { enterpriseId: id },
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Empresa removida com sucesso.",
      data: row,
    });
  };
}

export const maintainerEnterprisesController =
  new MaintainerEnterprisesController();
