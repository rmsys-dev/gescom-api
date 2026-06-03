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
  CreateProductsAnpInput,
  ListProductsAnpQuery,
  PatchProductsAnpInput,
} from "./schema.js";
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

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateProductsAnpInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await productsAnpService.create(
      body,
      auditContextFromPostAuth(auth, req, "products.products-anp.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "ANP de produto criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const productsAnpId = req.params["productsAnpId"] as string;
    const body = req.body as PatchProductsAnpInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await productsAnpService.patch(
      productsAnpId,
      body,
      auditContextFromPatchAuth(auth, req, "products.products-anp.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "ANP de produto atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const productsAnpId = req.params["productsAnpId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const row = await productsAnpService.delete(
      productsAnpId,
      auditContextFromDeleteAuth(auth, req, "products.products-anp.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "ANP de produto excluído com sucesso.",
      data: row,
    });
  };
}

export const productsAnpController = new ProductsAnpController();
