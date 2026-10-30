import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type { ListProductsNcmQuery } from "./schema.js";
import { productsNcmService } from "./service.js";

export class ProductsNcmController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListProductsNcmQuery>)
      .validatedQuery;
    const page = await productsNcmService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "NCM de produtos listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const productsNcmId = req.params["productsNcmId"] as string;
    const row = await productsNcmService.getById(productsNcmId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "NCM de produto recuperado com sucesso.",
      data: row,
    });
  };
}

export const productsNcmController = new ProductsNcmController();
