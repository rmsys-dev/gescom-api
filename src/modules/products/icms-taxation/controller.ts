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
  CreateIcmsTaxationInput,
  ListIcmsTaxationQuery,
  PatchIcmsTaxationInput,
} from "./schema.js";
import { icmsTaxationService } from "./service.js";

export class IcmsTaxationController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListIcmsTaxationQuery>)
      .validatedQuery;
    const page = await icmsTaxationService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Tributações ICMS listadas com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const icmsTaxationId = req.params["icmsTaxationId"] as string;
    const row = await icmsTaxationService.getById(icmsTaxationId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tributação ICMS recuperada com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateIcmsTaxationInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await icmsTaxationService.create(
      body,
      auditContextFromPostAuth(auth, req, "products.icms_taxation.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Tributação ICMS criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const icmsTaxationId = req.params["icmsTaxationId"] as string;
    const body = req.body as PatchIcmsTaxationInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await icmsTaxationService.patch(
      icmsTaxationId,
      body,
      auditContextFromPatchAuth(auth, req, "products.icms_taxation.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tributação ICMS atualizada com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const icmsTaxationId = req.params["icmsTaxationId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const row = await icmsTaxationService.delete(
      icmsTaxationId,
      auditContextFromDeleteAuth(auth, req, "products.icms_taxation.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tributação ICMS excluída com sucesso.",
      data: row,
    });
  };
}

export const icmsTaxationController = new IcmsTaxationController();
