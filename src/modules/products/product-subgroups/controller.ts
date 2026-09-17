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
  CreateProductSubgroupInput,
  ListProductSubgroupsQuery,
  PatchProductSubgroupInput,
} from "./schema.js";
import { productSubgroupsService } from "./service.js";

export class ProductSubgroupsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListProductSubgroupsQuery>)
      .validatedQuery;
    const enterpriseId =
      (req.params["enterpriseId"] as string | undefined) ??
      requireTenantEnterpriseId((req as RequestWithAuth).auth!);
    const page = await productSubgroupsService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Subgrupos de produto listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const productSubgroupId = req.params["productSubgroupId"] as string;
    const row = await productSubgroupsService.getById(
      enterpriseId,
      productSubgroupId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Subgrupo de produto recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const body = req.body as CreateProductSubgroupInput;
    const row = await productSubgroupsService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "products.product-subgroups.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Subgrupo de produto criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const productSubgroupId = req.params["productSubgroupId"] as string;
    const body = req.body as PatchProductSubgroupInput;
    const row = await productSubgroupsService.patch(
      enterpriseId,
      productSubgroupId,
      body,
      auditContextFromPatchAuth(
        auth,
        req,
        "products.product-subgroups.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Subgrupo de produto atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const productSubgroupId = req.params["productSubgroupId"] as string;
    const row = await productSubgroupsService.delete(
      enterpriseId,
      productSubgroupId,
      auditContextFromDeleteAuth(
        auth,
        req,
        "products.product-subgroups.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Subgrupo de produto excluído com sucesso.",
      data: row,
    });
  };
}

export const productSubgroupsController = new ProductSubgroupsController();
