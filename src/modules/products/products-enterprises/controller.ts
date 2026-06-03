import type { Request, Response } from "express";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
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
  CreateProductEnterpriseInput,
  ListProductsEnterprisesQuery,
  PatchProductEnterpriseInput,
} from "./schema.js";
import { productsEnterprisesService } from "./service.js";

export class ProductsEnterprisesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (
      req as RequestWithValidatedQuery<ListProductsEnterprisesQuery>
    ).validatedQuery;
    const page = await productsEnterprisesService.list(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      query,
    );
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Produtos da empresa listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const productEnterpriseId = req.params["productEnterpriseId"] as string;
    const row = await productsEnterprisesService.getById(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      productEnterpriseId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Produto da empresa recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const auth = reqAuth.auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const body = req.body as CreateProductEnterpriseInput;
    const row = await productsEnterprisesService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(auth, req, "products.products-enterprises.service.create", { enterpriseId }),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Produto da empresa criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const auth = reqAuth.auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const productEnterpriseId = req.params["productEnterpriseId"] as string;
    const body = req.body as PatchProductEnterpriseInput;
    const row = await productsEnterprisesService.patch(
      enterpriseId,
      productEnterpriseId,
      body,
      auditContextFromPatchAuth(auth, req, "products.products-enterprises.service.patch", { enterpriseId }),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Produto da empresa atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const auth = reqAuth.auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const productEnterpriseId = req.params["productEnterpriseId"] as string;
    const row = await productsEnterprisesService.delete(
      enterpriseId,
      productEnterpriseId,
      auditContextFromDeleteAuth(auth, req, "products.products-enterprises.service.delete", { enterpriseId }),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Produto da empresa excluído com sucesso.",
      data: row,
    });
  };
}

export const productsEnterprisesController =
  new ProductsEnterprisesController();
