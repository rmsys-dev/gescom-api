import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import { maintainerClassificationIbsCbsService } from "./service.js";
import type {
  CreateClassificationInput,
  PatchClassificationInput,
} from "./schema.js";

export class MaintainerClassificationIbsCbsController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerClassificationIbsCbsService.create(
      req.body as CreateClassificationInput,
      auditContextFromPostRequest(
        req,
        "maintainer.nfe.classification-ibs-cbs.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Classificacao IBS/CBS criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerClassificationIbsCbsService.patch(
      req.params["classificationId"] as string,
      req.body as PatchClassificationInput,
      auditContextFromRequest(
        req,
        "maintainer.nfe.classification-ibs-cbs.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Classificacao IBS/CBS atualizada com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerClassificationIbsCbsService.delete(
      req.params["classificationId"] as string,
      auditContextFromRequest(
        req,
        "maintainer.nfe.classification-ibs-cbs.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Classificacao IBS/CBS excluida com sucesso.",
      data: row,
    });
  };
}

export const maintainerClassificationIbsCbsController =
  new MaintainerClassificationIbsCbsController();
