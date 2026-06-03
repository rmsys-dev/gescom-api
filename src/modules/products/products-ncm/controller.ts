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
  CreateProductsNcmInput,
  ListProductsNcmQuery,
  PatchProductsNcmInput,
} from "./schema.js";
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

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateProductsNcmInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await productsNcmService.create(
      body,
      auditContextFromPostAuth(auth, req, "products.products-ncm.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "NCM de produto criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const productsNcmId = req.params["productsNcmId"] as string;
    const body = req.body as PatchProductsNcmInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await productsNcmService.patch(
      productsNcmId,
      body,
      auditContextFromPatchAuth(auth, req, "products.products-ncm.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "NCM de produto atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const productsNcmId = req.params["productsNcmId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const row = await productsNcmService.delete(
      productsNcmId,
      auditContextFromDeleteAuth(auth, req, "products.products-ncm.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "NCM de produto excluído com sucesso.",
      data: row,
    });
  };
}

export const productsNcmController = new ProductsNcmController();
