import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import { maintainerCstIbsCbsService } from "./service.js";
import type { CreateCstIbsCbsInput, PatchCstIbsCbsInput } from "./schema.js";

export class MaintainerCstIbsCbsController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerCstIbsCbsService.create(
      req.body as CreateCstIbsCbsInput,
      auditContextFromPostRequest(
        req,
        "maintainer.nfe.cst-ibs-cbs.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "CST IBS/CBS criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerCstIbsCbsService.patch(
      req.params["cstIbsCbsId"] as string,
      req.body as PatchCstIbsCbsInput,
      auditContextFromRequest(req, "maintainer.nfe.cst-ibs-cbs.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CST IBS/CBS atualizado com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerCstIbsCbsService.delete(
      req.params["cstIbsCbsId"] as string,
      auditContextFromRequest(req, "maintainer.nfe.cst-ibs-cbs.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CST IBS/CBS excluido com sucesso.",
      data: row,
    });
  };
}

export const maintainerCstIbsCbsController = new MaintainerCstIbsCbsController();
