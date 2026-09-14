import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type { ListTypeSpedQuery } from "./schema.js";
import { typeSpedService } from "./service.js";

export class TypeSpedController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListTypeSpedQuery>)
      .validatedQuery;
    const page = await typeSpedService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Tipos SPED listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const typeSpedId = req.params["typeSpedId"] as string;
    const row = await typeSpedService.getById(typeSpedId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo SPED recuperado com sucesso.",
      data: row,
    });
  };
}

export const typeSpedController = new TypeSpedController();
