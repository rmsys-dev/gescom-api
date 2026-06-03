import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import { sendPageFromService } from "../../../shared/responses/send-success-response.js";
import type { ListStatesQuery } from "./schema.js";
import { addressesStatesService } from "./service.js";

export class AddressesStatesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListStatesQuery>)
      .validatedQuery;
    const page = await addressesStatesService.list(query);
    sendPageFromService(res, HttpStatus.OK, "Estados listados com sucesso.", page);
  };
}

export const addressesStatesController = new AddressesStatesController();
