import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import { maintainerAnexosRtService } from "./service.js";
import type { CreateAnexoRtInput, PatchAnexoRtInput } from "./schema.js";

export class MaintainerAnexosRtController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerAnexosRtService.create(
      req.body as CreateAnexoRtInput,
      auditContextFromPostRequest(req, "maintainer.nfe.anexos-rt.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Anexo da reforma tributaria criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerAnexosRtService.patch(
      req.params["anexoRtId"] as string,
      req.body as PatchAnexoRtInput,
      auditContextFromRequest(req, "maintainer.nfe.anexos-rt.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Anexo da reforma tributaria atualizado com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerAnexosRtService.delete(
      req.params["anexoRtId"] as string,
      auditContextFromRequest(req, "maintainer.nfe.anexos-rt.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Anexo da reforma tributaria excluido com sucesso.",
      data: row,
    });
  };
}

export const maintainerAnexosRtController = new MaintainerAnexosRtController();
