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
  CreateStockBatchInput,
  ListStockBatchesQuery,
  PatchStockBatchInput,
} from "./schema.js";
import { stockBatchesService } from "./service.js";

export class StockBatchesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListStockBatchesQuery>)
      .validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await stockBatchesService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Lotes de estoque listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const stockBatchId = req.params["stockBatchId"] as string;
    const row = await stockBatchesService.getById(enterpriseId, stockBatchId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Lote de estoque recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateStockBatchInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockBatchesService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(auth, req, "stock.stock-batches.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Lote de estoque criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const stockBatchId = req.params["stockBatchId"] as string;
    const body = req.body as PatchStockBatchInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockBatchesService.patch(
      enterpriseId,
      stockBatchId,
      body,
      auditContextFromPatchAuth(auth, req, "stock.stock-batches.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Lote de estoque atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const stockBatchId = req.params["stockBatchId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockBatchesService.delete(
      enterpriseId,
      stockBatchId,
      auditContextFromDeleteAuth(auth, req, "stock.stock-batches.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Lote de estoque excluido com sucesso.",
      data: row,
    });
  };
}

export const stockBatchesController = new StockBatchesController();
