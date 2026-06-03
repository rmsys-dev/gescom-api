import type { Request, Response } from "express";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../shared/responses/send-success-response.js";
import type { ListDepartmentsQuery } from "./schema.js";
import { departmentsService } from "./service.js";

export class DepartmentsController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListDepartmentsQuery>)
      .validatedQuery;
    const page = await departmentsService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Departamentos listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const departmentId = req.params["departmentId"] as string;
    const row = await departmentsService.getById(departmentId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Departamento recuperado com sucesso.",
      data: row,
    });
  };
}

export const departmentsController = new DepartmentsController();
