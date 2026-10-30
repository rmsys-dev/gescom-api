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
  CreateVehiclesEnterprisesMemberInput,
  ListVehiclesEnterprisesMembersQuery,
  PatchVehiclesEnterprisesMemberInput,
} from "./schema.js";
import { vehiclesEnterprisesMembersService } from "./service.js";

export class VehiclesEnterprisesMembersController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (
      req as RequestWithValidatedQuery<ListVehiclesEnterprisesMembersQuery>
    ).validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await vehiclesEnterprisesMembersService.list(
      enterpriseId,
      query,
    );
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Vinculos veiculo/membro listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const vehiclesEnterprisesMemberId = req.params[
      "vehiclesEnterprisesMemberId"
    ] as string;
    const row = await vehiclesEnterprisesMembersService.getById(
      enterpriseId,
      vehiclesEnterprisesMemberId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Vinculo veiculo/membro recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateVehiclesEnterprisesMemberInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await vehiclesEnterprisesMembersService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "vehicles.vehicles-enterprises-members.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Vinculo veiculo/membro criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const vehiclesEnterprisesMemberId = req.params[
      "vehiclesEnterprisesMemberId"
    ] as string;
    const body = req.body as PatchVehiclesEnterprisesMemberInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await vehiclesEnterprisesMembersService.patch(
      enterpriseId,
      vehiclesEnterprisesMemberId,
      body,
      auditContextFromPatchAuth(
        auth,
        req,
        "vehicles.vehicles-enterprises-members.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Vinculo veiculo/membro atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const vehiclesEnterprisesMemberId = req.params[
      "vehiclesEnterprisesMemberId"
    ] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await vehiclesEnterprisesMembersService.delete(
      enterpriseId,
      vehiclesEnterprisesMemberId,
      auditContextFromDeleteAuth(
        auth,
        req,
        "vehicles.vehicles-enterprises-members.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Vinculo veiculo/membro inativado com sucesso.",
      data: row,
    });
  };
}

export const vehiclesEnterprisesMembersController =
  new VehiclesEnterprisesMembersController();
