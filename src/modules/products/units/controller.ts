import type { Request, Response } from "express";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
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
  CreateUnitInput,
  ListUnitsQuery,
  PatchUnitInput,
} from "./schema.js";
import { unitsService } from "./service.js";

export class UnitsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListUnitsQuery>)
      .validatedQuery;
    const page = await unitsService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Unidades de medida listadas com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const unitId = req.params["unitId"] as string;
    const row = await unitsService.getById(unitId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Unidade de medida recuperada com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateUnitInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await unitsService.create(
      body,
      auditContextFromPostAuth(auth, req, "products.units.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Unidade de medida criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const unitId = req.params["unitId"] as string;
    const body = req.body as PatchUnitInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await unitsService.patch(
      unitId,
      body,
      auditContextFromPatchAuth(auth, req, "products.units.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Unidade de medida atualizada com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const unitId = req.params["unitId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const row = await unitsService.delete(
      unitId,
      auditContextFromDeleteAuth(auth, req, "products.units.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Unidade de medida excluída com sucesso.",
      data: row,
    });
  };
}

export const unitsController = new UnitsController();
