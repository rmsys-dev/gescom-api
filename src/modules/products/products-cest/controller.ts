import type { Request, Response } from "express";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
import {
  auditContextFromDeleteAuth,
  auditContextFromPatchAuth,
  auditContextFromPostAuth,
} from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type {
  CreateProductsCestInput,
  ListProductsCestQuery,
  PatchProductsCestInput,
} from "./schema.js";
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

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateProductsCestInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await productsCestService.create(
      body,
      auditContextFromPostAuth(auth, req, "products.products-cest.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "CEST de produto criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const productsCestId = req.params["productsCestId"] as string;
    const body = req.body as PatchProductsCestInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await productsCestService.patch(
      productsCestId,
      body,
      auditContextFromPatchAuth(auth, req, "products.products-cest.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CEST de produto atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const productsCestId = req.params["productsCestId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const row = await productsCestService.delete(
      productsCestId,
      auditContextFromDeleteAuth(auth, req, "products.products-cest.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CEST de produto excluído com sucesso.",
      data: row,
    });
  };
}

export const productsCestController = new ProductsCestController();
