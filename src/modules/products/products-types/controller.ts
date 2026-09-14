import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type { ListTypesProductsQuery } from "./schema.js";
import { typesProductsService } from "./service.js";

export class TypesProductsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListTypesProductsQuery>)
      .validatedQuery;
    const page = await typesProductsService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Tipos de produto listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const typeProductId = req.params["typeProductId"] as string;
    const row = await typesProductsService.getById(typeProductId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de produto recuperado com sucesso.",
      data: row,
    });
  };
}

export const typesProductsController = new TypesProductsController();
