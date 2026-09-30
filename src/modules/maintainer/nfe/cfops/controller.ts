import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import { maintainerCfopsService } from "./service.js";
import type { CreateCfopInput, PatchCfopInput } from "./schema.js";

export class MaintainerCfopsController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerCfopsService.create(
      req.body as CreateCfopInput,
      auditContextFromPostRequest(req, "maintainer.nfe.cfops.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "CFOP criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerCfopsService.patch(
      req.params["cfopId"] as string,
      req.body as PatchCfopInput,
      auditContextFromRequest(req, "maintainer.nfe.cfops.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CFOP atualizado com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerCfopsService.delete(
      req.params["cfopId"] as string,
      auditContextFromRequest(req, "maintainer.nfe.cfops.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CFOP excluido com sucesso.",
      data: row,
    });
  };
}

export const maintainerCfopsController = new MaintainerCfopsController();
