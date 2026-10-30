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
  CreatePaymentTypesMethodsFlagsInput,
  ListPaymentTypesMethodsFlagsQuery,
  PatchPaymentTypesMethodsFlagsInput,
} from "./schema.js";
import { paymentTypesMethodsFlagsService } from "./service.js";

export class PaymentTypesMethodsFlagsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (
      req as RequestWithValidatedQuery<ListPaymentTypesMethodsFlagsQuery>
    ).validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await paymentTypesMethodsFlagsService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Configuracoes de pagamento listadas com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const paymentConfigId = req.params["paymentConfigId"] as string;
    const row = await paymentTypesMethodsFlagsService.getById(
      enterpriseId,
      paymentConfigId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Configuracao de pagamento recuperada com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreatePaymentTypesMethodsFlagsInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await paymentTypesMethodsFlagsService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "sales.payment-types-methods-flags.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Configuracao de pagamento criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const paymentConfigId = req.params["paymentConfigId"] as string;
    const body = req.body as PatchPaymentTypesMethodsFlagsInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await paymentTypesMethodsFlagsService.patch(
      enterpriseId,
      paymentConfigId,
      body,
      auditContextFromPatchAuth(
        auth,
        req,
        "sales.payment-types-methods-flags.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Configuracao de pagamento atualizada com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const paymentConfigId = req.params["paymentConfigId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await paymentTypesMethodsFlagsService.delete(
      enterpriseId,
      paymentConfigId,
      auditContextFromDeleteAuth(
        auth,
        req,
        "sales.payment-types-methods-flags.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Configuracao de pagamento excluida com sucesso.",
      data: row,
    });
  };
}

export const paymentTypesMethodsFlagsController =
  new PaymentTypesMethodsFlagsController();
