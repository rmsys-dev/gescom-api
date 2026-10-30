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
  CreateSectorRentalInput,
  ListSectorsRentalQuery,
  PatchSectorRentalInput,
} from "./schema.js";
import { sectorsRentalService } from "./service.js";

export class SectorsRentalController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListSectorsRentalQuery>)
      .validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await sectorsRentalService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Locacoes de estoque listadas com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const sectorRentalId = req.params["sectorRentalId"] as string;
    const row = await sectorsRentalService.getById(enterpriseId, sectorRentalId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Locacao de estoque recuperada com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateSectorRentalInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await sectorsRentalService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "sector.sectors-rental.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Locacao de estoque criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const sectorRentalId = req.params["sectorRentalId"] as string;
    const body = req.body as PatchSectorRentalInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await sectorsRentalService.patch(
      enterpriseId,
      sectorRentalId,
      body,
      auditContextFromPatchAuth(
        auth,
        req,
        "sector.sectors-rental.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Locacao de estoque atualizada com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const sectorRentalId = req.params["sectorRentalId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await sectorsRentalService.delete(
      enterpriseId,
      sectorRentalId,
      auditContextFromDeleteAuth(
        auth,
        req,
        "sector.sectors-rental.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Locacao de estoque excluida com sucesso.",
      data: row,
    });
  };
}

export const sectorsRentalController = new SectorsRentalController();
