import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type { ListProductsNbsQuery } from "./schema.js";
import { productsNbsService } from "./service.js";

export class ProductsNbsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListProductsNbsQuery>)
      .validatedQuery;
    const page = await productsNbsService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "NBS de produtos listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const productsNbsId = req.params["productsNbsId"] as string;
    const row = await productsNbsService.getById(productsNbsId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "NBS de produto recuperado com sucesso.",
      data: row,
    });
  };
}

export const productsNbsController = new ProductsNbsController();
