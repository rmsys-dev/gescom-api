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
  CreateSectorInput,
  ListSectorsQuery,
  PatchSectorInput,
} from "./schema.js";
import { sectorsService } from "./service.js";

export class SectorsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListSectorsQuery>)
      .validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await sectorsService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Setores de estoque listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const sectorId = req.params["sectorId"] as string;
    const row = await sectorsService.getById(enterpriseId, sectorId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Setor de estoque recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateSectorInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await sectorsService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(auth, req, "sector.sectors.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Setor de estoque criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const sectorId = req.params["sectorId"] as string;
    const body = req.body as PatchSectorInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await sectorsService.patch(
      enterpriseId,
      sectorId,
      body,
      auditContextFromPatchAuth(auth, req, "sector.sectors.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Setor de estoque atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const sectorId = req.params["sectorId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await sectorsService.delete(
      enterpriseId,
      sectorId,
      auditContextFromDeleteAuth(auth, req, "sector.sectors.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Setor de estoque excluido com sucesso.",
      data: row,
    });
  };
}

export const sectorsController = new SectorsController();
