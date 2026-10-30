import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type { ListPisCofinsSituationQuery } from "./schema.js";
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
}

export const pisCofinsSituationController = new PisCofinsSituationController();
