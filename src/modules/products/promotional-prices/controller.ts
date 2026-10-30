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
  CreatePromotionalPriceInput,
  ListPromotionalPricesQuery,
  PatchPromotionalPriceInput,
} from "./schema.js";
import { promotionalPricesService } from "./service.js";

export class PromotionalPricesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (
      req as RequestWithValidatedQuery<ListPromotionalPricesQuery>
    ).validatedQuery;
    const page = await promotionalPricesService.list(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      query,
    );
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Preços promocionais listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const promotionalPriceId = req.params["promotionalPriceId"] as string;
    const row = await promotionalPricesService.getById(
      requireTenantEnterpriseId((req as RequestWithAuth).auth!),
      promotionalPriceId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Preço promocional recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const auth = reqAuth.auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const body = req.body as CreatePromotionalPriceInput;
    const row = await promotionalPricesService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(auth, req, "products.promotional-prices.service.create", { enterpriseId }),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Preço promocional criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const auth = reqAuth.auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const promotionalPriceId = req.params["promotionalPriceId"] as string;
    const body = req.body as PatchPromotionalPriceInput;
    const row = await promotionalPricesService.patch(
      enterpriseId,
      promotionalPriceId,
      body,
      auditContextFromPatchAuth(auth, req, "products.promotional-prices.service.patch", { enterpriseId }),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Preço promocional atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const auth = reqAuth.auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const promotionalPriceId = req.params["promotionalPriceId"] as string;
    const row = await promotionalPricesService.delete(
      enterpriseId,
      promotionalPriceId,
      auditContextFromDeleteAuth(auth, req, "products.promotional-prices.service.delete", { enterpriseId }),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Preço promocional excluído com sucesso.",
      data: row,
    });
  };
}

export const promotionalPricesController = new PromotionalPricesController();
