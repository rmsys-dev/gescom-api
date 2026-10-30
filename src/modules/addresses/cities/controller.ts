import type { Request, Response } from "express";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type {
  CreateCityInput,
  ListCitiesQuery,
  PatchCityInput,
} from "./schema.js";
import { addressesCitiesService } from "./service.js";

export class AddressesCitiesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListCitiesQuery>)
      .validatedQuery;
    const page = await addressesCitiesService.list(query);
    sendPageFromService(res, HttpStatus.OK, "Cidades listadas com sucesso.", page);
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateCityInput;
    const row = await addressesCitiesService.create(
      body,
      auditContextFromPostRequest(req, "addresses.cities.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Cidade criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const cityId = req.params["cityId"] as string;
    const body = req.body as PatchCityInput;
    const row = await addressesCitiesService.patch(
      cityId,
      body,
      auditContextFromRequest(req, "addresses.cities.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Cidade atualizada com sucesso.",
      data: row,
    });
  };
}

export const addressesCitiesController = new AddressesCitiesController();
