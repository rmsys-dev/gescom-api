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
  CreateStockBatchBalanceInput,
  ListStockBatchBalancesQuery,
  PatchStockBatchBalanceInput,
} from "./schema.js";
import { stockBatchBalancesService } from "./service.js";

export class StockBatchBalancesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (
      req as RequestWithValidatedQuery<ListStockBatchBalancesQuery>
    ).validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await stockBatchBalancesService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Saldos de lote listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const stockBatchBalanceId = req.params["stockBatchBalanceId"] as string;
    const row = await stockBatchBalancesService.getById(
      enterpriseId,
      stockBatchBalanceId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Saldo de lote recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateStockBatchBalanceInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockBatchBalancesService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "stock.stock-batch-balances.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Saldo de lote criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const stockBatchBalanceId = req.params["stockBatchBalanceId"] as string;
    const body = req.body as PatchStockBatchBalanceInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockBatchBalancesService.patch(
      enterpriseId,
      stockBatchBalanceId,
      body,
      auditContextFromPatchAuth(
        auth,
        req,
        "stock.stock-batch-balances.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Saldo de lote atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const stockBatchBalanceId = req.params["stockBatchBalanceId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockBatchBalancesService.delete(
      enterpriseId,
      stockBatchBalanceId,
      auditContextFromDeleteAuth(
        auth,
        req,
        "stock.stock-batch-balances.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Saldo de lote excluido com sucesso.",
      data: row,
    });
  };
}

export const stockBatchBalancesController = new StockBatchBalancesController();
