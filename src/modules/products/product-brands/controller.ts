import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  auditContextFromDeleteAuth,
  auditContextFromPatchAuth,
  auditContextFromPostAuth,
} from "../../../shared/audit/request-meta.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type {
  CreateProductBrandInput,
  ListProductBrandsQuery,
  PatchProductBrandInput,
} from "./schema.js";
import { productBrandsService } from "./service.js";

export class ProductBrandsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListProductBrandsQuery>)
      .validatedQuery;
    const enterpriseId =
      (req.params["enterpriseId"] as string | undefined) ??
      requireTenantEnterpriseId((req as RequestWithAuth).auth!);
    const page = await productBrandsService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Marcas de produto listadas com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const productBrandId = req.params["productBrandId"] as string;
    const row = await productBrandsService.getById(enterpriseId, productBrandId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Marca de produto recuperada com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const body = req.body as CreateProductBrandInput;
    const row = await productBrandsService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "products.product-brands.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Marca de produto criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const productBrandId = req.params["productBrandId"] as string;
    const body = req.body as PatchProductBrandInput;
    const row = await productBrandsService.patch(
      enterpriseId,
      productBrandId,
      body,
      auditContextFromPatchAuth(
        auth,
        req,
        "products.product-brands.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Marca de produto atualizada com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const productBrandId = req.params["productBrandId"] as string;
    const row = await productBrandsService.delete(
      enterpriseId,
      productBrandId,
      auditContextFromDeleteAuth(
        auth,
        req,
        "products.product-brands.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Marca de produto excluída com sucesso.",
      data: row,
    });
  };
}

export const productBrandsController = new ProductBrandsController();
