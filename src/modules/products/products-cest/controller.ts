import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type { ListProductsCestQuery } from "./schema.js";
import { productsCestService } from "./service.js";

export class ProductsCestController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListProductsCestQuery>)
      .validatedQuery;
    const page = await productsCestService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "CEST de produtos listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const productsCestId = req.params["productsCestId"] as string;
    const row = await productsCestService.getById(productsCestId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CEST de produto recuperado com sucesso.",
      data: row,
    });
  };
}

export const productsCestController = new ProductsCestController();
