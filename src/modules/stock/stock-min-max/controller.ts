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
  CreateStockMinMaxInput,
  ListStockMinMaxQuery,
  PatchStockMinMaxInput,
} from "./schema.js";
import { stockMinMaxService } from "./service.js";

export class StockMinMaxController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListStockMinMaxQuery>)
      .validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await stockMinMaxService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Estoque min/max listado com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const stockMinMaxId = req.params["stockMinMaxId"] as string;
    const row = await stockMinMaxService.getById(enterpriseId, stockMinMaxId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Estoque min/max recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateStockMinMaxInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockMinMaxService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(auth, req, "stock.stock-min-max.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Estoque min/max criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const stockMinMaxId = req.params["stockMinMaxId"] as string;
    const body = req.body as PatchStockMinMaxInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockMinMaxService.patch(
      enterpriseId,
      stockMinMaxId,
      body,
      auditContextFromPatchAuth(auth, req, "stock.stock-min-max.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Estoque min/max atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const stockMinMaxId = req.params["stockMinMaxId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockMinMaxService.delete(
      enterpriseId,
      stockMinMaxId,
      auditContextFromDeleteAuth(auth, req, "stock.stock-min-max.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Estoque min/max excluido com sucesso.",
      data: row,
    });
  };
}

export const stockMinMaxController = new StockMinMaxController();
