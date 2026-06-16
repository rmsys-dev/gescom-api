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
  CreateCountryInput,
  ListCountriesQuery,
  PatchCountryInput,
} from "./schema.js";
import { addressesCountriesService } from "./service.js";

export class AddressesCountriesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListCountriesQuery>)
      .validatedQuery;
    const page = await addressesCountriesService.list(query);
    sendPageFromService(res, HttpStatus.OK, "Paises listados com sucesso.", page);
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateCountryInput;
    const row = await addressesCountriesService.create(
      body,
      auditContextFromPostRequest(req, "addresses.countries.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "País criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const countryId = req.params["countryId"] as string;
    const body = req.body as PatchCountryInput;
    const row = await addressesCountriesService.patch(
      countryId,
      body,
      auditContextFromRequest(req, "addresses.countries.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "País atualizado com sucesso.",
      data: row,
    });
  };
}

export const addressesCountriesController = new AddressesCountriesController();
