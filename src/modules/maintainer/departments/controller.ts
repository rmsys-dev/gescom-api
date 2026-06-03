import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import type {
  CreateMaintainerDepartmentInput,
  PatchMaintainerDepartmentInput,
} from "./schema.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../shared/audit/request-meta.js";
import { maintainerDepartmentsService } from "./service.js";

export class MaintainerDepartmentsController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMaintainerDepartmentInput;
    const row = await maintainerDepartmentsService.create(
      body,
      auditContextFromPostRequest(req, "maintainer.departments.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Departamento criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const departmentId = req.params["departmentId"] as string;
    const body = req.body as PatchMaintainerDepartmentInput;
    const row = await maintainerDepartmentsService.patch(
      departmentId,
      body,
      auditContextFromRequest(req, "maintainer.departments.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Departamento atualizado com sucesso.",
      data: row,
    });
  };
}

export const maintainerDepartmentsController =
  new MaintainerDepartmentsController();
