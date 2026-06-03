import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import { sendPageFromService } from "../../../shared/responses/send-success-response.js";
import type { ListCitiesQuery } from "./schema.js";
import { addressesCitiesService } from "./service.js";

export class AddressesCitiesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListCitiesQuery>)
      .validatedQuery;
    const page = await addressesCitiesService.list(query);
    sendPageFromService(res, HttpStatus.OK, "Cidades listadas com sucesso.", page);
  };
}

export const addressesCitiesController = new AddressesCitiesController();
