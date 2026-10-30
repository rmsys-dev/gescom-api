import type { Request, Response } from "express";
import type { RequestWithAuth } from "../../shared/middleware/auth-middleware.js";
import { requireTenantEnterpriseId } from "../../shared/controllers/tenant-context.js";
import {
  auditContextFromDeleteAuth,
  auditContextFromPatchAuth,
  auditContextFromPostAuth,
} from "../../shared/audit/request-meta.js";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../shared/responses/send-success-response.js";
import type {
  CreatePrinterInput,
  ListPrintersQuery,
  PatchPrinterInput,
} from "./schema.js";
import { printersService } from "./service.js";

export class PrintersController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListPrintersQuery>).validatedQuery;
    const enterpriseId = requireTenantEnterpriseId((req as RequestWithAuth).auth!);
    const page = await printersService.list(enterpriseId, query);
    sendPageFromService(res, HttpStatus.OK, "Impressoras listadas com sucesso.", page);
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId((req as RequestWithAuth).auth!);
    const printerId = req.params["printerId"] as string;
    const row = await printersService.getById(enterpriseId, printerId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Impressora recuperada com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreatePrinterInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await printersService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(auth, req, "printers.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Impressora criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const printerId = req.params["printerId"] as string;
    const body = req.body as PatchPrinterInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await printersService.patch(
      enterpriseId,
      printerId,
      body,
      auditContextFromPatchAuth(auth, req, "printers.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Impressora atualizada com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const printerId = req.params["printerId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await printersService.delete(
      enterpriseId,
      printerId,
      auditContextFromDeleteAuth(auth, req, "printers.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Impressora excluida com sucesso.",
      data: row,
    });
  };
}

export const printersController = new PrintersController();
