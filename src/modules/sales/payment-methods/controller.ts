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
  CreatePaymentMethodInput,
  ListPaymentMethodsQuery,
  PatchPaymentMethodInput,
} from "./schema.js";
import { paymentMethodsService } from "./service.js";

export class PaymentMethodsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListPaymentMethodsQuery>)
      .validatedQuery;
    const page = await paymentMethodsService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Meios de pagamento listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const paymentMethodId = req.params["paymentMethodId"] as string;
    const row = await paymentMethodsService.getById(paymentMethodId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Meio de pagamento recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreatePaymentMethodInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await paymentMethodsService.create(
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "sales.payment-methods.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Meio de pagamento criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const paymentMethodId = req.params["paymentMethodId"] as string;
    const body = req.body as PatchPaymentMethodInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await paymentMethodsService.patch(
      paymentMethodId,
      body,
      auditContextFromPatchAuth(
        auth,
        req,
        "sales.payment-methods.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Meio de pagamento atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const paymentMethodId = req.params["paymentMethodId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const row = await paymentMethodsService.delete(
      paymentMethodId,
      auditContextFromDeleteAuth(
        auth,
        req,
        "sales.payment-methods.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Meio de pagamento excluido com sucesso.",
      data: row,
    });
  };
}

export const paymentMethodsController = new PaymentMethodsController();
