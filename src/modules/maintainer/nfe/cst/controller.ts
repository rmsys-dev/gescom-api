import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import { maintainerCstService } from "./service.js";
import type { CreateCstInput, PatchCstInput } from "./schema.js";

export class MaintainerCstController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerCstService.create(
      req.body as CreateCstInput,
      auditContextFromPostRequest(req, "maintainer.nfe.cst.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "CST criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerCstService.patch(
      req.params["cstId"] as string,
      req.body as PatchCstInput,
      auditContextFromRequest(req, "maintainer.nfe.cst.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CST atualizado com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerCstService.delete(
      req.params["cstId"] as string,
      auditContextFromRequest(req, "maintainer.nfe.cst.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CST excluido com sucesso.",
      data: row,
    });
  };
}

export const maintainerCstController = new MaintainerCstController();
