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
  CreateStockLocationInput,
  ListStockLocationsQuery,
  PatchStockLocationInput,
} from "./schema.js";
import { stockLocationsService } from "./service.js";

export class StockLocationsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListStockLocationsQuery>)
      .validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await stockLocationsService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Locacoes fisicas de estoque listadas com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const stockLocationId = req.params["stockLocationId"] as string;
    const row = await stockLocationsService.getById(
      enterpriseId,
      stockLocationId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Locacao fisica de estoque recuperada com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateStockLocationInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockLocationsService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(auth, req, "stock.stock-locations.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Locacao fisica de estoque criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const stockLocationId = req.params["stockLocationId"] as string;
    const body = req.body as PatchStockLocationInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockLocationsService.patch(
      enterpriseId,
      stockLocationId,
      body,
      auditContextFromPatchAuth(auth, req, "stock.stock-locations.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Locacao fisica de estoque atualizada com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const stockLocationId = req.params["stockLocationId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockLocationsService.delete(
      enterpriseId,
      stockLocationId,
      auditContextFromDeleteAuth(
        auth,
        req,
        "stock.stock-locations.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Locacao fisica de estoque excluida com sucesso.",
      data: row,
    });
  };
}

export const stockLocationsController = new StockLocationsController();
