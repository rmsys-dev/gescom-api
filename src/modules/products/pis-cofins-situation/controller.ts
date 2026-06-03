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
  CreatePisCofinsSituationInput,
  ListPisCofinsSituationQuery,
  PatchPisCofinsSituationInput,
} from "./schema.js";
import { pisCofinsSituationService } from "./service.js";

export class PisCofinsSituationController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (
      req as RequestWithValidatedQuery<ListPisCofinsSituationQuery>
    ).validatedQuery;
    const page = await pisCofinsSituationService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Situações PIS/COFINS listadas com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const pisCofinsSituationId = req.params["pisCofinsSituationId"] as string;
    const row = await pisCofinsSituationService.getById(pisCofinsSituationId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Situação PIS/COFINS recuperada com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreatePisCofinsSituationInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await pisCofinsSituationService.create(
      body,
      auditContextFromPostAuth(auth, req, "products.pis-cofins-situation.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Situação PIS/COFINS criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const pisCofinsSituationId = req.params["pisCofinsSituationId"] as string;
    const body = req.body as PatchPisCofinsSituationInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await pisCofinsSituationService.patch(
      pisCofinsSituationId,
      body,
      auditContextFromPatchAuth(
        auth,
        req,
        "products.pis-cofins-situation.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Situação PIS/COFINS atualizada com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const pisCofinsSituationId = req.params["pisCofinsSituationId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const row = await pisCofinsSituationService.delete(
      pisCofinsSituationId,
      auditContextFromDeleteAuth(auth, req, "products.pis-cofins-situation.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Situação PIS/COFINS excluída com sucesso.",
      data: row,
    });
  };
}

export const pisCofinsSituationController = new PisCofinsSituationController();
