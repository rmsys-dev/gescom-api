import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import { sendPageFromService } from "../../../shared/responses/send-success-response.js";
import type { ListCountriesQuery } from "./schema.js";
import { addressesCountriesService } from "./service.js";

export class AddressesCountriesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListCountriesQuery>)
      .validatedQuery;
    const page = await addressesCountriesService.list(query);
    sendPageFromService(res, HttpStatus.OK, "Paises listados com sucesso.", page);
  };
}

export const addressesCountriesController = new AddressesCountriesController();
