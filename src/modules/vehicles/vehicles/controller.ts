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
  CreateVehicleInput,
  ListVehiclesQuery,
  PatchVehicleInput,
} from "./schema.js";
import { vehiclesService } from "./service.js";

export class VehiclesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListVehiclesQuery>)
      .validatedQuery;
    const page = await vehiclesService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Veiculos listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const vehicleId = req.params["vehicleId"] as string;
    const row = await vehiclesService.getById(vehicleId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Veiculo recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateVehicleInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await vehiclesService.create(
      body,
      auditContextFromPostAuth(auth, req, "vehicles.vehicles.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Veiculo criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const vehicleId = req.params["vehicleId"] as string;
    const body = req.body as PatchVehicleInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await vehiclesService.patch(
      vehicleId,
      body,
      auditContextFromPatchAuth(auth, req, "vehicles.vehicles.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Veiculo atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const vehicleId = req.params["vehicleId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const row = await vehiclesService.delete(
      vehicleId,
      auditContextFromDeleteAuth(auth, req, "vehicles.vehicles.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Veiculo excluido com sucesso.",
      data: row,
    });
  };
}

export const vehiclesController = new VehiclesController();
