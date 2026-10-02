import type { Request, Response } from "express";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import type { ListStockGroupQuery } from "./schema.js";
import { stockGroupService } from "./service.js";

export class StockGroupController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListStockGroupQuery>).validatedQuery;
    const enterpriseId = requireTenantEnterpriseId((req as RequestWithAuth).auth!);
    const { items, total, limit, offset, group, enterprises } =
      await stockGroupService.list(enterpriseId, query);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Estoque do grupo listado com sucesso.",
      data: { group, enterprises, items, total },
      pagination: { total, limit, offset },
    });
  };
}

export const stockGroupController = new StockGroupController();
