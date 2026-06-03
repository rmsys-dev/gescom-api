import type { Request, Response } from "express";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromPostAuth } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type {
  CreateStockMovementInput,
  ListStockMovementsQuery,
} from "./schema.js";
import { stockMovementsService } from "./service.js";

export class StockMovementsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListStockMovementsQuery>)
      .validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await stockMovementsService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Movimentos de estoque listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const stockMovementId = req.params["stockMovementId"] as string;
    const row = await stockMovementsService.getById(
      enterpriseId,
      stockMovementId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Movimento de estoque recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateStockMovementInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockMovementsService.create(
      enterpriseId,
      auth.userId ?? null,
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "stock.stock-movements.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Movimento de estoque registrado com sucesso.",
      data: row,
    });
  };
}

export const stockMovementsController = new StockMovementsController();
