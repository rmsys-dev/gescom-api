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
  CreateTypeSpedInput,
  ListTypeSpedQuery,
  PatchTypeSpedInput,
} from "./schema.js";
import { typeSpedService } from "./service.js";

export class TypeSpedController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListTypeSpedQuery>)
      .validatedQuery;
    const page = await typeSpedService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Tipos SPED listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const typeSpedId = req.params["typeSpedId"] as string;
    const row = await typeSpedService.getById(typeSpedId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo SPED recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateTypeSpedInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await typeSpedService.create(
      body,
      auditContextFromPostAuth(auth, req, "products.type-sped.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Tipo SPED criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const typeSpedId = req.params["typeSpedId"] as string;
    const body = req.body as PatchTypeSpedInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await typeSpedService.patch(
      typeSpedId,
      body,
      auditContextFromPatchAuth(auth, req, "products.type-sped.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo SPED atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const typeSpedId = req.params["typeSpedId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const row = await typeSpedService.delete(
      typeSpedId,
      auditContextFromDeleteAuth(auth, req, "products.type-sped.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo SPED excluído com sucesso.",
      data: row,
    });
  };
}

export const typeSpedController = new TypeSpedController();
