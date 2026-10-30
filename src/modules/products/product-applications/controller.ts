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
  CreateProductApplicationInput,
  ListProductApplicationsQuery,
  PatchProductApplicationInput,
} from "./schema.js";
import { productApplicationsService } from "./service.js";

export class ProductApplicationsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (
      req as RequestWithValidatedQuery<ListProductApplicationsQuery>
    ).validatedQuery;
    const page = await productApplicationsService.list(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      query,
    );
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Aplicações de produto listadas com sucesso.",
      page,
    );
  };

  public listById = async (req: Request, res: Response): Promise<void> => {
    const id = req.params["id"] as string;
    const row = await productApplicationsService.getById(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      id,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Aplicação de produto recuperada com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const auth = reqAuth.auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const body = req.body as CreateProductApplicationInput;
    const row = await productApplicationsService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(auth, req, "products.product-applications.service.create", { enterpriseId }),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Aplicação de produto criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const auth = reqAuth.auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const id = req.params["id"] as string;
    const body = req.body as PatchProductApplicationInput;
    const row = await productApplicationsService.patch(
      enterpriseId,
      id,
      body,
      auditContextFromPatchAuth(auth, req, "products.product-applications.service.patch", { enterpriseId }),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Aplicação de produto atualizada com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const auth = reqAuth.auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const id = req.params["id"] as string;
    const row = await productApplicationsService.delete(
      enterpriseId,
      id,
      auditContextFromDeleteAuth(auth, req, "products.product-applications.service.delete", { enterpriseId }),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Aplicação de produto excluída com sucesso.",
      data: row,
    });
  };
}

export const productApplicationsController =
  new ProductApplicationsController();
