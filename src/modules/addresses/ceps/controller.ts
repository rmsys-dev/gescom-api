import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import { sendPageFromService } from "../../../shared/responses/send-success-response.js";
import type { ListCepsQuery } from "./schema.js";
import { addressesCepsService } from "./service.js";

export class AddressesCepsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListCepsQuery>).validatedQuery;
    const page = await addressesCepsService.list(query);
    sendPageFromService(res, HttpStatus.OK, "CEPs listados com sucesso.", page);
  };
}

export const addressesCepsController = new AddressesCepsController();
