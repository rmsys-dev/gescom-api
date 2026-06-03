import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import type {
  CreateMaintainerStateInput,
  PatchMaintainerStateInput,
} from "./schema.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../shared/audit/request-meta.js";
import { maintainerStatesService } from "./service.js";

export class MaintainerStatesController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMaintainerStateInput;
    const row = await maintainerStatesService.create(
      body,
      auditContextFromPostRequest(req, "maintainer.states.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Estado criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const stateId = req.params["stateId"] as string;
    const body = req.body as PatchMaintainerStateInput;
    const row = await maintainerStatesService.patch(
      stateId,
      body,
      auditContextFromRequest(req, "maintainer.states.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Estado atualizado com sucesso.",
      data: row,
    });
  };
}

export const maintainerStatesController = new MaintainerStatesController();
