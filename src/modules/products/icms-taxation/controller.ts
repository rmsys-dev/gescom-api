import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type { ListIcmsTaxationQuery } from "./schema.js";
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
}

export const icmsTaxationController = new IcmsTaxationController();
