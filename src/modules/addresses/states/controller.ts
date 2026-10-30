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
import type {
  CreateStateInput,
  ListStatesQuery,
  PatchStateInput,
} from "./schema.js";
import { addressesStatesService } from "./service.js";

export class AddressesStatesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListStatesQuery>)
      .validatedQuery;
    const page = await addressesStatesService.list(query);
    sendPageFromService(res, HttpStatus.OK, "Estados listados com sucesso.", page);
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateStateInput;
    const row = await addressesStatesService.create(
      body,
      auditContextFromPostRequest(req, "addresses.states.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Estado criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const stateId = req.params["stateId"] as string;
    const body = req.body as PatchStateInput;
    const row = await addressesStatesService.patch(
      stateId,
      body,
      auditContextFromRequest(req, "addresses.states.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Estado atualizado com sucesso.",
      data: row,
    });
  };
}

export const addressesStatesController = new AddressesStatesController();
