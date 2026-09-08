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
  CreateTypeProductInput,
  ListTypesProductsQuery,
  PatchTypeProductInput,
} from "./schema.js";
import { typesProductsService } from "./service.js";

export class TypesProductsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListTypesProductsQuery>)
      .validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await typesProductsService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Tipos de produto listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const typeProductId = req.params["typeProductId"] as string;
    const row = await typesProductsService.getById(enterpriseId, typeProductId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de produto recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateTypeProductInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await typesProductsService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "products.products-types.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Tipo de produto criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const typeProductId = req.params["typeProductId"] as string;
    const body = req.body as PatchTypeProductInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await typesProductsService.patch(
      enterpriseId,
      typeProductId,
      body,
      auditContextFromPatchAuth(
        auth,
        req,
        "products.products-types.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de produto atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const typeProductId = req.params["typeProductId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await typesProductsService.delete(
      enterpriseId,
      typeProductId,
      auditContextFromDeleteAuth(
        auth,
        req,
        "products.products-types.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de produto excluído com sucesso.",
      data: row,
    });
  };
}

export const typesProductsController = new TypesProductsController();
