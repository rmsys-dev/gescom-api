import type { Request, Response } from "express";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithAuth } from "../../shared/middleware/auth-middleware.js";
import { requireTenantEnterpriseId } from "../../shared/controllers/tenant-context.js";
import type { RequestWithValidatedQuery } from "../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../shared/responses/send-success-response.js";
import type { ListEntityAuditLogQuery } from "./schema.js";
import { entityAuditLogService } from "./service.js";

export class EntityAuditLogController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListEntityAuditLogQuery>)
      .validatedQuery;
    const enterpriseId = requireTenantEnterpriseId((req as RequestWithAuth).auth!);
    const page = await entityAuditLogService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Registros de auditoria listados com sucesso.",
      page,
    );
  };

  public actors = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId((req as RequestWithAuth).auth!);
    const items = await entityAuditLogService.actors(enterpriseId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Usuarios da auditoria listados com sucesso.",
      data: items,
    });
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId((req as RequestWithAuth).auth!);
    const entityAuditLogId = req.params["entityAuditLogId"] as string;
    const row = await entityAuditLogService.getById(enterpriseId, entityAuditLogId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Registro de auditoria recuperado com sucesso.",
      data: row,
    });
  };
}

export const entityAuditLogController = new EntityAuditLogController();
