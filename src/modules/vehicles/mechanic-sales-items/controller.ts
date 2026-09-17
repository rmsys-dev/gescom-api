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
  CreateMechanicSalesItemInput,
  ListMechanicSalesItemsQuery,
  PatchMechanicSalesItemInput,
} from "./schema.js";
import { mechanicSalesItemsService } from "./service.js";

export class MechanicSalesItemsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (
      req as RequestWithValidatedQuery<ListMechanicSalesItemsQuery>
    ).validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await mechanicSalesItemsService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Comissoes de mecanicos listadas com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const mechanicSalesItemId = req.params["mechanicSalesItemId"] as string;
    const row = await mechanicSalesItemsService.getById(
      enterpriseId,
      mechanicSalesItemId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Comissao de mecanico recuperada com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMechanicSalesItemInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await mechanicSalesItemsService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "vehicles.mechanic-sales-items.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Comissao de mecanico criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const mechanicSalesItemId = req.params["mechanicSalesItemId"] as string;
    const body = req.body as PatchMechanicSalesItemInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await mechanicSalesItemsService.patch(
      enterpriseId,
      mechanicSalesItemId,
      body,
      auditContextFromPatchAuth(
        auth,
        req,
        "vehicles.mechanic-sales-items.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Comissao de mecanico atualizada com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const mechanicSalesItemId = req.params["mechanicSalesItemId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await mechanicSalesItemsService.delete(
      enterpriseId,
      mechanicSalesItemId,
      auditContextFromDeleteAuth(
        auth,
        req,
        "vehicles.mechanic-sales-items.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Comissao de mecanico excluida com sucesso.",
      data: row,
    });
  };
}

export const mechanicSalesItemsController = new MechanicSalesItemsController();
