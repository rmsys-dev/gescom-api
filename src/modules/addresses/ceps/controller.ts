import type { Request, Response } from "express";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type { CreateCepInput, ListCepsQuery, PatchCepInput } from "./schema.js";
import { addressesCepsService } from "./service.js";

export class AddressesCepsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListCepsQuery>).validatedQuery;
    const page = await addressesCepsService.list(query);
    sendPageFromService(res, HttpStatus.OK, "CEPs listados com sucesso.", page);
  };

  public lookup = async (req: Request, res: Response): Promise<void> => {
    const cepNumber = req.params["cepNumber"] as string;
    const data = await addressesCepsService.lookup(cepNumber);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CEP consultado com sucesso.",
      data,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateCepInput;
    const row = await addressesCepsService.create(
      body,
      auditContextFromPostRequest(req, "addresses.ceps.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "CEP criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const cepId = req.params["cepId"] as string;
    const body = req.body as PatchCepInput;
    const row = await addressesCepsService.patch(
      cepId,
      body,
      auditContextFromRequest(req, "addresses.ceps.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "CEP atualizado com sucesso.",
      data: row,
    });
  };
}

export const addressesCepsController = new AddressesCepsController();
