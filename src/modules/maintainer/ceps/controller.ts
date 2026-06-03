import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import type {
  CreateMaintainerCepInput,
  PatchMaintainerCepInput,
} from "./schema.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../shared/audit/request-meta.js";
import { maintainerCepsService } from "./service.js";

export class MaintainerCepsController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMaintainerCepInput;
    const row = await maintainerCepsService.create(
      body,
      auditContextFromPostRequest(req, "maintainer.ceps.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "CEP criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const cepId = req.params["cepId"] as string;
    const body = req.body as PatchMaintainerCepInput;
    const row = await maintainerCepsService.patch(
      cepId,
      body,
      auditContextFromRequest(req, "maintainer.ceps.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CEP atualizado com sucesso.",
      data: row,
    });
  };
}

export const maintainerCepsController = new MaintainerCepsController();
