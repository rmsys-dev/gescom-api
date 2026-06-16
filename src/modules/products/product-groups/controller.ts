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
  CreateProductGroupInput,
  ListProductGroupsQuery,
  PatchProductGroupInput,
} from "./schema.js";
import { productGroupsService } from "./service.js";

export class ProductGroupsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListProductGroupsQuery>)
      .validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await productGroupsService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Grupos de produto listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const productGroupId = req.params["productGroupId"] as string;
    const row = await productGroupsService.getById(enterpriseId, productGroupId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Grupo de produto recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateProductGroupInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await productGroupsService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(auth, req, "products.product-groups.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Grupo de produto criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const productGroupId = req.params["productGroupId"] as string;
    const body = req.body as PatchProductGroupInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await productGroupsService.patch(
      enterpriseId,
      productGroupId,
      body,
      auditContextFromPatchAuth(auth, req, "products.product-groups.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Grupo de produto atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const productGroupId = req.params["productGroupId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await productGroupsService.delete(
      enterpriseId,
      productGroupId,
      auditContextFromDeleteAuth(auth, req, "products.product-groups.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Grupo de produto excluído com sucesso.",
      data: row,
    });
  };
}

export const productGroupsController = new ProductGroupsController();
