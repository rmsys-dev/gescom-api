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
  ConvertBudgetToSaleInput,
  CreateSaleInput,
  CreateSaleItemInput,
  ListSalesQuery,
  PatchSaleInput,
  PatchSaleItemInput,
} from "./schema.js";
import { salesService, type SaleAuthContext } from "./service.js";

const saleAuthFromRequest = (auth: RequestWithAuth["auth"]): SaleAuthContext => ({
  userId: auth!.userId!,
  memberId: auth!.memberId,
  memberDepartmentId: auth!.memberDepartmentId,
});

export class SalesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const query = (req as RequestWithValidatedQuery<ListSalesQuery>).validatedQuery;

    if (query.sellerId && auth.userId && query.sellerId !== auth.userId) {
      throw new ForbiddenError(
        "Nao e permitido listar vendas de outro vendedor",
      );
    }

    const page = await salesService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Vendas listadas com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const saleId = req.params["saleId"] as string;
    const data = await salesService.getById(enterpriseId, saleId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Venda recuperada com sucesso.",
      data,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const body = req.body as CreateSaleInput;
    const data = await salesService.create(
      enterpriseId,
      auth.userId ? saleAuthFromRequest(auth) : null,
      body,
      auditContextFromPostAuth(auth, req, "sales.service.create"),
      req.headers["x-gescom-client"],
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Venda criada com sucesso.",
      data,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const saleId = req.params["saleId"] as string;
    const body = req.body as PatchSaleInput;
    const data = await salesService.patch(
      enterpriseId,
      saleId,
      auth.userId ? saleAuthFromRequest(auth) : null,
      body,
      auditContextFromPatchAuth(auth, req, "sales.service.patch"),
      req.headers["x-gescom-client"],
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Venda atualizada com sucesso.",
      data,
    });
  };

  public addItem = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const saleId = req.params["saleId"] as string;
    const body = req.body as CreateSaleItemInput;
    const data = await salesService.addItem(
      enterpriseId,
      saleId,
      saleAuthFromRequest(auth),
      body,
      auditContextFromPostAuth(auth, req, "sales.service.addItem"),
      req.headers["x-gescom-client"],
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Item incluido na venda com sucesso.",
      data,
    });
  };

  public recalculateTotals = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const saleId = req.params["saleId"] as string;
    const data = await salesService.recalculateTotals(
      enterpriseId,
      saleId,
      auditContextFromPostAuth(auth, req, "sales.service.recalculateTotals"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Totais da venda recalculados com sucesso.",
      data,
    });
  };

  public removeItem = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const saleId = req.params["saleId"] as string;
    const saleItemId = req.params["saleItemId"] as string;
    const data = await salesService.removeItem(
      enterpriseId,
      saleId,
      saleItemId,
      auth.userId ?? null,
      auditContextFromDeleteAuth(auth, req, "sales.service.removeItem"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Item removido da venda com sucesso.",
      data,
    });
  };

  public updateItem = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const saleId = req.params["saleId"] as string;
    const saleItemId = req.params["saleItemId"] as string;
    const body = req.body as PatchSaleItemInput;
    const data = await salesService.updateItem(
      enterpriseId,
      saleId,
      saleItemId,
      auth.userId ?? null,
      body,
      auditContextFromPatchAuth(auth, req, "sales.service.updateItem"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Item da venda atualizado com sucesso.",
      data,
    });
  };

  public convertBudgetToSale = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const saleId = req.params["saleId"] as string;
    const body = req.body as ConvertBudgetToSaleInput;
    const data = await salesService.convertBudgetToSale(
      enterpriseId,
      saleId,
      auth.userId ? saleAuthFromRequest(auth) : null,
      body,
      auditContextFromPostAuth(auth, req, "sales.service.convertBudgetToSale"),
      req.headers["x-gescom-client"],
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Orcamento convertido em venda com sucesso.",
      data,
    });
  };

  public listBudgetConversions = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const saleId = req.params["saleId"] as string;
    const result = await salesService.listBudgetConversions(
      enterpriseId,
      saleId,
    );
    sendListSuccessResponse(
      res,
      "Conversoes de orcamento listadas com sucesso.",
      result.items,
    );
  };
}

export const salesController = new SalesController();
