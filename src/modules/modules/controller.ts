import type { Request, Response } from "express";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../shared/responses/send-success-response.js";
import type { ListModulesQuery } from "./schema.js";
import { modulesService } from "./service.js";

export class ModulesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListModulesQuery>)
      .validatedQuery;
    const page = await modulesService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Modulos listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const moduleId = req.params["moduleId"] as string;
    const row = await modulesService.getById(moduleId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Modulo recuperado com sucesso.",
      data: row,
    });
  };
}

export const modulesController = new ModulesController();
