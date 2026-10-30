import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import type {
  CreateMaintainerProductsCestInput,
  PatchMaintainerProductsCestInput,
} from "./schema.js";
import { maintainerProductsCestService } from "./service.js";

export class MaintainerProductsCestController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMaintainerProductsCestInput;
    const row = await maintainerProductsCestService.create(
      body,
      auditContextFromPostRequest(
        req,
        "maintainer.products.products-cest.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "CEST de produto criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const productsCestId = req.params["productsCestId"] as string;
    const body = req.body as PatchMaintainerProductsCestInput;
    const row = await maintainerProductsCestService.patch(
      productsCestId,
      body,
      auditContextFromRequest(req, "maintainer.products.products-cest.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CEST de produto atualizado com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const productsCestId = req.params["productsCestId"] as string;
    const row = await maintainerProductsCestService.delete(
      productsCestId,
      auditContextFromRequest(req, "maintainer.products.products-cest.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CEST de produto excluÃ­do com sucesso.",
      data: row,
    });
  };
}

export const maintainerProductsCestController =
  new MaintainerProductsCestController();
