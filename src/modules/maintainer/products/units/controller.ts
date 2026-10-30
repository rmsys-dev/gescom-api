import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import type {
  CreateMaintainerUnitInput,
  PatchMaintainerUnitInput,
} from "./schema.js";
import { maintainerUnitsService } from "./service.js";

export class MaintainerUnitsController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMaintainerUnitInput;
    const row = await maintainerUnitsService.create(
      body,
      auditContextFromPostRequest(req, "maintainer.products.units.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Unidade de medida criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const unitId = req.params["unitId"] as string;
    const body = req.body as PatchMaintainerUnitInput;
    const row = await maintainerUnitsService.patch(
      unitId,
      body,
      auditContextFromRequest(req, "maintainer.products.units.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Unidade de medida atualizada com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const unitId = req.params["unitId"] as string;
    const row = await maintainerUnitsService.delete(
      unitId,
      auditContextFromRequest(req, "maintainer.products.units.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Unidade de medida excluÃ­da com sucesso.",
      data: row,
    });
  };
}

export const maintainerUnitsController = new MaintainerUnitsController();
