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
  CreateProductTaxationInput,
  ListProductTaxationQuery,
  PatchProductTaxationInput,
} from "./schema.js";
import { productTaxationService } from "./service.js";

export class ProductTaxationController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListProductTaxationQuery>)
      .validatedQuery;
    const page = await productTaxationService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Tributações de produto listadas com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const productTaxationId = req.params["productTaxationId"] as string;
    const row = await productTaxationService.getById(productTaxationId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tributação de produto recuperada com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateProductTaxationInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await productTaxationService.create(
      body,
      auditContextFromPostAuth(auth, req, "products.product-taxation.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Tributação de produto criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const productTaxationId = req.params["productTaxationId"] as string;
    const body = req.body as PatchProductTaxationInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await productTaxationService.patch(
      productTaxationId,
      body,
      auditContextFromPatchAuth(auth, req, "products.product-taxation.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tributação de produto atualizada com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const productTaxationId = req.params["productTaxationId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const row = await productTaxationService.delete(
      productTaxationId,
      auditContextFromDeleteAuth(auth, req, "products.product-taxation.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tributação de produto excluída com sucesso.",
      data: row,
    });
  };
}

export const productTaxationController = new ProductTaxationController();
