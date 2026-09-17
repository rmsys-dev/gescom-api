import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import type {
  CreateMaintainerIcmsTaxationInput,
  PatchMaintainerIcmsTaxationInput,
} from "./schema.js";
import { maintainerIcmsTaxationService } from "./service.js";

export class MaintainerIcmsTaxationController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMaintainerIcmsTaxationInput;
    const row = await maintainerIcmsTaxationService.create(
      body,
      auditContextFromPostRequest(
        req,
        "maintainer.products.icms-taxation.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "TributaÃ§Ã£o ICMS criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const icmsTaxationId = req.params["icmsTaxationId"] as string;
    const body = req.body as PatchMaintainerIcmsTaxationInput;
    const row = await maintainerIcmsTaxationService.patch(
      icmsTaxationId,
      body,
      auditContextFromRequest(req, "maintainer.products.icms-taxation.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "TributaÃ§Ã£o ICMS atualizada com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const icmsTaxationId = req.params["icmsTaxationId"] as string;
    const row = await maintainerIcmsTaxationService.delete(
      icmsTaxationId,
      auditContextFromRequest(req, "maintainer.products.icms-taxation.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "TributaÃ§Ã£o ICMS excluÃ­da com sucesso.",
      data: row,
    });
  };
}

export const maintainerIcmsTaxationController =
  new MaintainerIcmsTaxationController();
