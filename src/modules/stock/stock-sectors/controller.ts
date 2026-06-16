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
  CreateStockSectorInput,
  ListStockSectorsQuery,
  PatchStockSectorInput,
} from "./schema.js";
import { stockSectorsService } from "./service.js";

export class StockSectorsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListStockSectorsQuery>)
      .validatedQuery;
    const enterpriseId = requireTenantEnterpriseId(
      (req as RequestWithAuth).auth!,
    );
    const page = await stockSectorsService.list(enterpriseId, query);
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
    const stockSectorId = req.params["stockSectorId"] as string;
    const row = await stockSectorsService.getById(enterpriseId, stockSectorId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Setor de estoque recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateStockSectorInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockSectorsService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(auth, req, "stock.stock-sectors.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Setor de estoque criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const stockSectorId = req.params["stockSectorId"] as string;
    const body = req.body as PatchStockSectorInput;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockSectorsService.patch(
      enterpriseId,
      stockSectorId,
      body,
      auditContextFromPatchAuth(auth, req, "stock.stock-sectors.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Setor de estoque atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const stockSectorId = req.params["stockSectorId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const enterpriseId = requireTenantEnterpriseId(auth);
    const row = await stockSectorsService.delete(
      enterpriseId,
      stockSectorId,
      auditContextFromDeleteAuth(auth, req, "stock.stock-sectors.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Setor de estoque excluido com sucesso.",
      data: row,
    });
  };
}

export const stockSectorsController = new StockSectorsController();
