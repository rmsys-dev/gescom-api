import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import { auditContextFromRequest } from "../../../../shared/audit/request-meta.js";
import { nfeParametersService } from "../../../nfe/parameters/service.js";
import type { PatchNfeParametersInput } from "../../../nfe/parameters/schema.js";

export class MaintainerNfeParametersController {
  public list = async (_req: Request, res: Response): Promise<void> => {
    const data = await nfeParametersService.list();
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Parametros globais de NF-e listados com sucesso.",
      data,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as PatchNfeParametersInput;
    const data = await nfeParametersService.patch(
      body,
      auditContextFromRequest(
        req,
        "maintainer.nfe.parameters.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Parametros globais de NF-e atualizados com sucesso.",
      data,
    });
  };
}

export const maintainerNfeParametersController =
  new MaintainerNfeParametersController();
