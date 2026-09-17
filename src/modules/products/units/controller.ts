import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type { ListUnitsQuery } from "./schema.js";
import { unitsService } from "./service.js";

export class UnitsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListUnitsQuery>)
      .validatedQuery;
    const page = await unitsService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Unidades de medida listadas com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const unitId = req.params["unitId"] as string;
    const row = await unitsService.getById(unitId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Unidade de medida recuperada com sucesso.",
      data: row,
    });
  };
}

export const unitsController = new UnitsController();
