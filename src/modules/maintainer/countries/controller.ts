import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import type {
  CreateMaintainerCountryInput,
  PatchMaintainerCountryInput,
} from "./schema.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../shared/audit/request-meta.js";
import { maintainerCountriesService } from "./service.js";

export class MaintainerCountriesController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMaintainerCountryInput;
    const row = await maintainerCountriesService.create(
      body,
      auditContextFromPostRequest(req, "maintainer.countries.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "País criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const countryId = req.params["countryId"] as string;
    const body = req.body as PatchMaintainerCountryInput;
    const row = await maintainerCountriesService.patch(
      countryId,
      body,
      auditContextFromRequest(req, "maintainer.countries.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "País atualizado com sucesso.",
      data: row,
    });
  };
}

export const maintainerCountriesController =
  new MaintainerCountriesController();
