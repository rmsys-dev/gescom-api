import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import type {
  CreateMaintainerPisCofinsSituationInput,
  PatchMaintainerPisCofinsSituationInput,
} from "./schema.js";
import { maintainerPisCofinsSituationService } from "./service.js";

export class MaintainerPisCofinsSituationController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMaintainerPisCofinsSituationInput;
    const row = await maintainerPisCofinsSituationService.create(
      body,
      auditContextFromPostRequest(
        req,
        "maintainer.products.pis-cofins-situation.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "SituaÃ§Ã£o PIS/COFINS criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const pisCofinsSituationId = req.params["pisCofinsSituationId"] as string;
    const body = req.body as PatchMaintainerPisCofinsSituationInput;
    const row = await maintainerPisCofinsSituationService.patch(
      pisCofinsSituationId,
      body,
      auditContextFromRequest(
        req,
        "maintainer.products.pis-cofins-situation.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "SituaÃ§Ã£o PIS/COFINS atualizada com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const pisCofinsSituationId = req.params["pisCofinsSituationId"] as string;
    const row = await maintainerPisCofinsSituationService.delete(
      pisCofinsSituationId,
      auditContextFromRequest(
        req,
        "maintainer.products.pis-cofins-situation.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "SituaÃ§Ã£o PIS/COFINS excluÃ­da com sucesso.",
      data: row,
    });
  };
}

export const maintainerPisCofinsSituationController =
  new MaintainerPisCofinsSituationController();
