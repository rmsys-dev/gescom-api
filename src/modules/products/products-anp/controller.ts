import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type { ListProductsAnpQuery } from "./schema.js";
import { productsAnpService } from "./service.js";

export class ProductsAnpController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListProductsAnpQuery>)
      .validatedQuery;
    const page = await productsAnpService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "ANP de produtos listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const productsAnpId = req.params["productsAnpId"] as string;
    const row = await productsAnpService.getById(productsAnpId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "ANP de produto recuperado com sucesso.",
      data: row,
    });
  };
}

export const productsAnpController = new ProductsAnpController();
