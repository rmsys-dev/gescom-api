import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import { maintainerDocumentModelsService } from "./service.js";
import type { CreateDocumentModelInput, PatchDocumentModelInput } from "./schema.js";

export class MaintainerDocumentModelsController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerDocumentModelsService.create(
      req.body as CreateDocumentModelInput,
      auditContextFromPostRequest(req, "maintainer.nfe.document-models.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Modelo de documento criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerDocumentModelsService.patch(
      req.params["documentModelId"] as string,
      req.body as PatchDocumentModelInput,
      auditContextFromRequest(req, "maintainer.nfe.document-models.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Modelo de documento atualizado com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const row = await maintainerDocumentModelsService.delete(
      req.params["documentModelId"] as string,
      auditContextFromRequest(req, "maintainer.nfe.document-models.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Modelo de documento excluido com sucesso.",
      data: row,
    });
  };
}

export const maintainerDocumentModelsController = new MaintainerDocumentModelsController();
