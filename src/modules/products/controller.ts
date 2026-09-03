import type { Request, Response } from "express";
import type { RequestWithAuth } from "../../shared/middleware/auth-middleware.js";
import { requireTenantEnterpriseId } from "../../shared/controllers/tenant-context.js";
import { auditContextFromPostAuth } from "../../shared/audit/request-meta.js";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../shared/responses/send-success-response.js";
import type {
  CreateProductWithEnterpriseInput,
  ListProductsQuery,
} from "./schema.js";
import { productsService } from "./service.js";

export class ProductsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListProductsQuery>)
      .validatedQuery;
    const page = await productsService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Produtos listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const productId = req.params["productId"] as string;
    const row = await productsService.getById(productId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Produto recuperado com sucesso.",
      data: row,
    });
  };

  /**
   * POST /products: cria produto+vínculo ou, se o barCode (ou a descrição sem
   * barCode) já existir, apenas o snapshot em products-enterprises
   * (`linkedExistingProduct`) — espelha create-with-user de membros.
   */
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateProductWithEnterpriseInput;
    const reqAuth = req as RequestWithAuth;
    const auth = reqAuth.auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await productsService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(auth, req, "products.service.create", {
        enterpriseId,
      }),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: row.linkedExistingProduct
        ? "Produto encontrado. Vinculo com a empresa criado com sucesso."
        : "Produto e vinculo com a empresa criados com sucesso.",
      data: row,
    });
  };
}

export const productsController = new ProductsController();
