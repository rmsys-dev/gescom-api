import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import type {
  CreateMaintainerModuleInput,
  PatchMaintainerModuleInput,
} from "./schema.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../shared/audit/request-meta.js";
import { maintainerModulesService } from "./service.js";

export class MaintainerModulesController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMaintainerModuleInput;
    const row = await maintainerModulesService.create(
      body,
      auditContextFromPostRequest(req, "maintainer.modules.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Modulo criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const moduleId = req.params["moduleId"] as string;
    const body = req.body as PatchMaintainerModuleInput;
    const row = await maintainerModulesService.patch(
      moduleId,
      body,
      auditContextFromRequest(req, "maintainer.modules.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Modulo atualizado com sucesso.",
      data: row,
    });
  };
}

export const maintainerModulesController = new MaintainerModulesController();
