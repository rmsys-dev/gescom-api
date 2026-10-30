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
  CreateStateDivisionInput,
  ListStatesDivisionsQuery,
  PatchStateDivisionInput,
} from "./schema.js";
import { addressesStatesDivisionsService } from "./service.js";

export class AddressesStatesDivisionsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListStatesDivisionsQuery>)
      .validatedQuery;
    const page = await addressesStatesDivisionsService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Divisoes de estado listadas com sucesso.",
      page,
    );
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const row = await addressesStatesDivisionsService.create(
      req.body as CreateStateDivisionInput,
      auditContextFromPostRequest(req, "addresses.states-divisions.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Divisao de estado criada com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const row = await addressesStatesDivisionsService.patch(
      req.params["stateDivisionId"] as string,
      req.body as PatchStateDivisionInput,
      auditContextFromRequest(req, "addresses.states-divisions.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Divisao de estado atualizada com sucesso.",
      data: row,
    });
  };
}

export const addressesStatesDivisionsController =
  new AddressesStatesDivisionsController();
