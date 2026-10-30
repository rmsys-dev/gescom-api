import type { Request, Response } from "express";
import type { RequestWithAuth } from "../../shared/middleware/auth-middleware.js";
import { requireTenantEnterpriseId } from "../../shared/controllers/tenant-context.js";
import {
  auditContextFromDeleteAuth,
  auditContextFromPatchAuth,
  auditContextFromPostAuth,
} from "../../shared/audit/request-meta.js";
import { ForbiddenError } from "../../shared/errors/app-error.js";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../shared/middleware/validate-schema.js";
import {
  sendListSuccessResponse,
  sendPageFromService,
  sendSuccessResponse,
} from "../../shared/responses/send-success-response.js";
import type {
  ConvertBudgetToOsInput,
  ConvertOsToSaleInput,
  CreateSaleItemInput,
  CreateServiceOrderInput,
  ListSaleSellersQuery,
  ListServiceOrdersQuery,
  PatchSaleInput,
  PatchSaleItemInput,
  PrintSaleQuery,
} from "../sales/schema.js";
import type { SaleAuthContext } from "../sales/service.js";
import { serviceOrderService } from "./service.js";

const authFromRequest = (auth: RequestWithAuth["auth"]): SaleAuthContext => ({
  userId: auth!.userId!,
  memberId: auth!.memberId,
});

export class ServiceOrderController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const query = (req as RequestWithValidatedQuery<ListServiceOrdersQuery>)
      .validatedQuery;

    if (query.sellerId && auth.userId && query.sellerId !== auth.userId) {
      throw new ForbiddenError(
        "Nao e permitido listar ordens de servico de outro vendedor",
      );
    }

    const page = await serviceOrderService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Ordens de servico listadas com sucesso.",
      page,
    );
  };

  public summary = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const query = (req as RequestWithValidatedQuery<ListServiceOrdersQuery>)
      .validatedQuery;

    if (query.sellerId && auth.userId && query.sellerId !== auth.userId) {
      throw new ForbiddenError(
        "Nao e permitido totalizar ordens de servico de outro vendedor",
      );
    }

    const data = await serviceOrderService.summary(enterpriseId, query);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Totais das ordens de servico",
      data,
    });
  };

  public listSellers = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const query = (req as RequestWithValidatedQuery<ListSaleSellersQuery>)
      .validatedQuery;
    const page = await serviceOrderService.listSellers(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Vendedores listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const serviceOrderId = req.params["serviceOrderId"] as string;
    const data = await serviceOrderService.getById(enterpriseId, serviceOrderId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Ordem de servico recuperada com sucesso.",
      data,
    });
  };

  public print = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const serviceOrderId = req.params["serviceOrderId"] as string;
    const query = (req as RequestWithValidatedQuery<PrintSaleQuery>)
      .validatedQuery;
    const format = query.format ?? "pdf";

    if (format === "html") {
      const document = await serviceOrderService.getPrintHtml(
        enterpriseId,
        serviceOrderId,
      );
      res
        .status(HttpStatus.OK)
        .set(
          "Content-Security-Policy",
          "default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data: https:; base-uri 'none'; form-action 'none'",
        )
        .type("html")
        .send(document.html);
      return;
    }

    const { pdf, filename } = await serviceOrderService.getPrintPdf(
      enterpriseId,
      serviceOrderId,
    );
    res
      .status(HttpStatus.OK)
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": String(pdf.length),
        "Cache-Control": "no-store",
      })
      .send(pdf);
  };

  public listConversions = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const serviceOrderId = req.params["serviceOrderId"] as string;
    const result = await serviceOrderService.listConversions(
      enterpriseId,
      serviceOrderId,
    );
    sendListSuccessResponse(
      res,
      "Conversoes listadas com sucesso.",
      result.items,
    );
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const body = req.body as CreateServiceOrderInput;
    const data = await serviceOrderService.create(
      enterpriseId,
      auth.userId ? authFromRequest(auth) : null,
      body,
      auditContextFromPostAuth(auth, req, "service-order.service.create"),
      req.headers["x-gescom-client"],
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Ordem de servico criada com sucesso.",
      data,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const serviceOrderId = req.params["serviceOrderId"] as string;
    const body = req.body as PatchSaleInput;
    const data = await serviceOrderService.patch(
      enterpriseId,
      serviceOrderId,
      auth.userId ? authFromRequest(auth) : null,
      body,
      auditContextFromPatchAuth(auth, req, "service-order.service.patch"),
      req.headers["x-gescom-client"],
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Ordem de servico atualizada com sucesso.",
      data,
    });
  };

  public addItem = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const serviceOrderId = req.params["serviceOrderId"] as string;
    const body = req.body as CreateSaleItemInput;
    const data = await serviceOrderService.addItem(
      enterpriseId,
      serviceOrderId,
      authFromRequest(auth),
      body,
      auditContextFromPostAuth(auth, req, "service-order.service.addItem"),
      req.headers["x-gescom-client"],
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Item incluido na ordem de servico com sucesso.",
      data,
    });
  };

  public updateItem = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const serviceOrderId = req.params["serviceOrderId"] as string;
    const saleItemId = req.params["saleItemId"] as string;
    const body = req.body as PatchSaleItemInput;
    const data = await serviceOrderService.updateItem(
      enterpriseId,
      serviceOrderId,
      saleItemId,
      auth.userId ?? null,
      body,
      auditContextFromPatchAuth(auth, req, "service-order.service.updateItem"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Item da ordem de servico atualizado com sucesso.",
      data,
    });
  };

  public removeItem = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const serviceOrderId = req.params["serviceOrderId"] as string;
    const saleItemId = req.params["saleItemId"] as string;
    const data = await serviceOrderService.removeItem(
      enterpriseId,
      serviceOrderId,
      saleItemId,
      auth.userId ?? null,
      auditContextFromDeleteAuth(auth, req, "service-order.service.removeItem"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Item removido da ordem de servico com sucesso.",
      data,
    });
  };

  public recalculateTotals = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const serviceOrderId = req.params["serviceOrderId"] as string;
    const data = await serviceOrderService.recalculateTotals(
      enterpriseId,
      serviceOrderId,
      auditContextFromPostAuth(
        auth,
        req,
        "service-order.service.recalculateTotals",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Totais da ordem de servico recalculados com sucesso.",
      data,
    });
  };

  public convertFromBudget = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const saleId = req.params["saleId"] as string;
    const body = req.body as ConvertBudgetToOsInput;
    const data = await serviceOrderService.convertFromBudget(
      enterpriseId,
      saleId,
      auth.userId ? authFromRequest(auth) : null,
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "service-order.service.convertFromBudget",
      ),
      req.headers["x-gescom-client"],
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Orcamento convertido em ordem de servico com sucesso.",
      data,
    });
  };

  public convertToSale = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const serviceOrderId = req.params["serviceOrderId"] as string;
    const body = req.body as ConvertOsToSaleInput;
    const data = await serviceOrderService.convertToSale(
      enterpriseId,
      serviceOrderId,
      auth.userId ? authFromRequest(auth) : null,
      body,
      auditContextFromPostAuth(auth, req, "service-order.service.convertToSale"),
      req.headers["x-gescom-client"],
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Ordem de servico convertida em venda com sucesso.",
      data,
    });
  };

  public cancel = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const serviceOrderId = req.params["serviceOrderId"] as string;
    const data = await serviceOrderService.cancel(
      enterpriseId,
      serviceOrderId,
      auth.userId ?? null,
      auditContextFromPostAuth(auth, req, "service-order.service.cancel"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Ordem de servico cancelada com sucesso.",
      data,
    });
  };

  public estorno = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const serviceOrderId = req.params["serviceOrderId"] as string;
    const data = await serviceOrderService.estorno(
      enterpriseId,
      serviceOrderId,
      auditContextFromPostAuth(auth, req, "service-order.service.estorno"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Ordem de servico estornada com sucesso.",
      data,
    });
  };
}

export const serviceOrderController = new ServiceOrderController();
