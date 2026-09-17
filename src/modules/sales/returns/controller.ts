import type { Request, Response } from "express";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromPostAuth } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import {
  sendListSuccessResponse,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type {
  CreateFullReturnInput,
  CreatePartialReturnInput,
} from "./schema.js";
import { salesReturnsService } from "./service.js";

export class SalesReturnsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const saleId = req.params["saleId"] as string;
    const result = await salesReturnsService.list(enterpriseId, saleId);
    sendListSuccessResponse(
      res,
      "Devolucoes da venda listadas com sucesso.",
      result.items,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const saleId = req.params["saleId"] as string;
    const salesReturnId = req.params["salesReturnId"] as string;
    const data = await salesReturnsService.getById(
      enterpriseId,
      saleId,
      salesReturnId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Devolucao recuperada com sucesso.",
      data,
    });
  };

  public createPartial = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const saleId = req.params["saleId"] as string;
    const body = req.body as CreatePartialReturnInput;
    const data = await salesReturnsService.createPartialReturn(
      enterpriseId,
      saleId,
      auth.userId ?? "",
      body,
      auditContextFromPostAuth(auth, req, "sales.returns.service.createPartial"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Devolucao parcial registrada com sucesso.",
      data,
    });
  };

  public createFull = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const saleId = req.params["saleId"] as string;
    const body = req.body as CreateFullReturnInput;
    const data = await salesReturnsService.createFullReturn(
      enterpriseId,
      saleId,
      auth.userId ?? "",
      body,
      auditContextFromPostAuth(auth, req, "sales.returns.service.createFull"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Devolucao total registrada com sucesso.",
      data,
    });
  };
}

export const salesReturnsController = new SalesReturnsController();
