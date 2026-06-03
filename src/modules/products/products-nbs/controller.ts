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
  CreateProductsNbsInput,
  ListProductsNbsQuery,
  PatchProductsNbsInput,
} from "./schema.js";
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

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateProductsNbsInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await productsNbsService.create(
      body,
      auditContextFromPostAuth(auth, req, "products.products-nbs.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "NBS de produto criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const productsNbsId = req.params["productsNbsId"] as string;
    const body = req.body as PatchProductsNbsInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await productsNbsService.patch(
      productsNbsId,
      body,
      auditContextFromPatchAuth(auth, req, "products.products-nbs.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "NBS de produto atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const productsNbsId = req.params["productsNbsId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const row = await productsNbsService.delete(
      productsNbsId,
      auditContextFromDeleteAuth(auth, req, "products.products-nbs.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "NBS de produto excluído com sucesso.",
      data: row,
    });
  };
}

export const productsNbsController = new ProductsNbsController();
