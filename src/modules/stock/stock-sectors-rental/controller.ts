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
  CreateStockSectorRentalInput,
  ListStockSectorsRentalQuery,
  PatchStockSectorRentalInput,
} from "./schema.js";
import { stockSectorsRentalService } from "./service.js";

export class StockSectorsRentalController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (
      req as RequestWithValidatedQuery<ListStockSectorsRentalQuery>
    ).validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await stockSectorsRentalService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Saldos de estoque listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const stockSectorRentalId = req.params["stockSectorRentalId"] as string;
    const row = await stockSectorsRentalService.getById(
      enterpriseId,
      stockSectorRentalId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Saldo de estoque recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateStockSectorRentalInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockSectorsRentalService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "stock.stock-sectors-rental.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Saldo de estoque criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const stockSectorRentalId = req.params["stockSectorRentalId"] as string;
    const body = req.body as PatchStockSectorRentalInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockSectorsRentalService.patch(
      enterpriseId,
      stockSectorRentalId,
      body,
      auditContextFromPatchAuth(
        auth,
        req,
        "stock.stock-sectors-rental.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Saldo de estoque atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const stockSectorRentalId = req.params["stockSectorRentalId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockSectorsRentalService.delete(
      enterpriseId,
      stockSectorRentalId,
      auditContextFromDeleteAuth(
        auth,
        req,
        "stock.stock-sectors-rental.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Saldo de estoque excluido com sucesso.",
      data: row,
    });
  };
}

export const stockSectorsRentalController = new StockSectorsRentalController();
