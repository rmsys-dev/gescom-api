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
  CreateTypeFlagInput,
  ListTypeFlagsQuery,
  PatchTypeFlagInput,
} from "./schema.js";
import { typeFlagsService } from "./service.js";

export class TypeFlagsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListTypeFlagsQuery>)
      .validatedQuery;
    const page = await typeFlagsService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Bandeiras listadas com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const typeFlagId = req.params["typeFlagId"] as string;
    const row = await typeFlagsService.getById(typeFlagId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Bandeira recuperada com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateTypeFlagInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await typeFlagsService.create(
      body,
      auditContextFromPostAuth(auth, req, "sales.type-flags.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Bandeira criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const typeFlagId = req.params["typeFlagId"] as string;
    const body = req.body as PatchTypeFlagInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await typeFlagsService.patch(
      typeFlagId,
      body,
      auditContextFromPatchAuth(auth, req, "sales.type-flags.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Bandeira atualizada com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const typeFlagId = req.params["typeFlagId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const row = await typeFlagsService.delete(
      typeFlagId,
      auditContextFromDeleteAuth(auth, req, "sales.type-flags.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Bandeira excluida com sucesso.",
      data: row,
    });
  };
}

export const typeFlagsController = new TypeFlagsController();
