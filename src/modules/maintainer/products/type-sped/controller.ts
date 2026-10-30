import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import type {
  CreateMaintainerTypeSpedInput,
  PatchMaintainerTypeSpedInput,
} from "./schema.js";
import { maintainerTypeSpedService } from "./service.js";

export class MaintainerTypeSpedController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMaintainerTypeSpedInput;
    const row = await maintainerTypeSpedService.create(
      body,
      auditContextFromPostRequest(
        req,
        "maintainer.products.type-sped.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Tipo SPED criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const typeSpedId = req.params["typeSpedId"] as string;
    const body = req.body as PatchMaintainerTypeSpedInput;
    const row = await maintainerTypeSpedService.patch(
      typeSpedId,
      body,
      auditContextFromRequest(
        req,
        "maintainer.products.type-sped.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo SPED atualizado com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const typeSpedId = req.params["typeSpedId"] as string;
    const row = await maintainerTypeSpedService.delete(
      typeSpedId,
      auditContextFromRequest(
        req,
        "maintainer.products.type-sped.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo SPED excluido com sucesso.",
      data: row,
    });
  };
}

export const maintainerTypeSpedController = new MaintainerTypeSpedController();
