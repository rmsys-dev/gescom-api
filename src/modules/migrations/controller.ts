import type { Request, Response } from "express";
import type { RequestWithAuth } from "../../shared/middleware/auth-middleware.js";
import { requireTenantEnterpriseId } from "../../shared/controllers/tenant-context.js";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../shared/middleware/validate-schema.js";
import { sendPageFromService } from "../../shared/responses/send-success-response.js";
import type { ListMigrationSalesQuery } from "./schema.js";
import { migrationsService } from "./service.js";

export class MigrationsController {
  public listSales = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListMigrationSalesQuery>)
      .validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await migrationsService.listSales(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Vendas recuperadas para migracao.",
      page,
    );
  };
}

export const migrationsController = new MigrationsController();
