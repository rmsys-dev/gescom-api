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
  CreatePriceInput,
  ListPricesQuery,
  PatchPriceInput,
} from "./schema.js";
import { pricesService } from "./service.js";

export class PricesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListPricesQuery>)
      .validatedQuery;
    const page = await pricesService.list(requireTenantEnterpriseId((req as RequestWithAuth).auth!), query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Preços listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const priceId = req.params["priceId"] as string;
    const row = await pricesService.getById(requireTenantEnterpriseId((req as RequestWithAuth).auth!), priceId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Preço recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const auth = reqAuth.auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const body = req.body as CreatePriceInput;
    const row = await pricesService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(auth, req, "products.prices.service.create", { enterpriseId }),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Preço criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const auth = reqAuth.auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const priceId = req.params["priceId"] as string;
    const body = req.body as PatchPriceInput;
    const row = await pricesService.patch(
      enterpriseId,
      priceId,
      body,
      auditContextFromPatchAuth(auth, req, "products.prices.service.patch", { enterpriseId }),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Preço atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const auth = reqAuth.auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const priceId = req.params["priceId"] as string;
    const row = await pricesService.delete(
      enterpriseId,
      priceId,
      auditContextFromDeleteAuth(auth, req, "products.prices.service.delete", { enterpriseId }),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Preço excluído com sucesso.",
      data: row,
    });
  };
}

export const pricesController = new PricesController();
