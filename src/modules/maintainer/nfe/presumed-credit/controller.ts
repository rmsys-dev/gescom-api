import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import { maintainerPresumedCreditService } from "./service.js";
import type {
  CreatePresumedCreditInput,
  PatchPresumedCreditInput,
} from "./schema.js";

export class MaintainerPresumedCreditController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerPresumedCreditService.create(
      req.body as CreatePresumedCreditInput,
      auditContextFromPostRequest(
        req,
        "maintainer.nfe.presumed-credit.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Credito presumido criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerPresumedCreditService.patch(
      req.params["presumedCreditId"] as string,
      req.body as PatchPresumedCreditInput,
      auditContextFromRequest(req, "maintainer.nfe.presumed-credit.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Credito presumido atualizado com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerPresumedCreditService.delete(
      req.params["presumedCreditId"] as string,
      auditContextFromRequest(req, "maintainer.nfe.presumed-credit.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Credito presumido excluido com sucesso.",
      data: row,
    });
  };
}

export const maintainerPresumedCreditController =
  new MaintainerPresumedCreditController();
