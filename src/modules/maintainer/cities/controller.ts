import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import type {
  CreateMaintainerCityInput,
  PatchMaintainerCityInput,
} from "./schema.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../shared/audit/request-meta.js";
import { maintainerCitiesService } from "./service.js";

export class MaintainerCitiesController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMaintainerCityInput;
    const row = await maintainerCitiesService.create(
      body,
      auditContextFromPostRequest(req, "maintainer.cities.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Cidade criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const cityId = req.params["cityId"] as string;
    const body = req.body as PatchMaintainerCityInput;
    const row = await maintainerCitiesService.patch(
      cityId,
      body,
      auditContextFromRequest(req, "maintainer.cities.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Cidade atualizada com sucesso.",
      data: row,
    });
  };
}

export const maintainerCitiesController = new MaintainerCitiesController();
