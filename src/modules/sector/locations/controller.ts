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
  CreateLocationInput,
  ListLocationsQuery,
  PatchLocationInput,
} from "./schema.js";
import { locationsService } from "../locations/service.js";

export class LocationsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListLocationsQuery>)
      .validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await locationsService.list(enterpriseId, query);
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
    const locationId = req.params["locationId"] as string;
    const row = await locationsService.getById(enterpriseId, locationId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Locacao fisica de estoque recuperada com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateLocationInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await locationsService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(auth, req, "sector.locations.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Locacao fisica de estoque criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const locationId = req.params["locationId"] as string;
    const body = req.body as PatchLocationInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await locationsService.patch(
      enterpriseId,
      locationId,
      body,
      auditContextFromPatchAuth(auth, req, "sector.locations.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Locacao fisica de estoque atualizada com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const locationId = req.params["locationId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await locationsService.delete(
      enterpriseId,
      locationId,
      auditContextFromDeleteAuth(auth, req, "sector.locations.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Locacao fisica de estoque excluida com sucesso.",
      data: row,
    });
  };
}

export const locationsController = new LocationsController();
