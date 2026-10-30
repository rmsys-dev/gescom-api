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
  CreatePaymentTypeInput,
  ListPaymentTypesQuery,
  PatchPaymentTypeInput,
} from "./schema.js";
import { paymentTypesService } from "./service.js";

export class PaymentTypesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListPaymentTypesQuery>)
      .validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await paymentTypesService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Tipos de pagamento listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const paymentTypeId = req.params["paymentTypeId"] as string;
    const row = await paymentTypesService.getById(enterpriseId, paymentTypeId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de pagamento recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreatePaymentTypeInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await paymentTypesService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "sales.payment-types.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Tipo de pagamento criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const paymentTypeId = req.params["paymentTypeId"] as string;
    const body = req.body as PatchPaymentTypeInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await paymentTypesService.patch(
      enterpriseId,
      paymentTypeId,
      body,
      auditContextFromPatchAuth(
        auth,
        req,
        "sales.payment-types.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de pagamento atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const paymentTypeId = req.params["paymentTypeId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await paymentTypesService.delete(
      enterpriseId,
      paymentTypeId,
      auditContextFromDeleteAuth(
        auth,
        req,
        "sales.payment-types.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de pagamento excluido com sucesso.",
      data: row,
    });
  };
}

export const paymentTypesController = new PaymentTypesController();
