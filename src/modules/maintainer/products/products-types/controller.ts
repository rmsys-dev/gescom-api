import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import type {
  CreateMaintainerTypeProductInput,
  PatchMaintainerTypeProductInput,
} from "./schema.js";
import { maintainerTypesProductsService } from "./service.js";

export class MaintainerTypesProductsController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMaintainerTypeProductInput;
    const row = await maintainerTypesProductsService.create(
      body,
      auditContextFromPostRequest(
        req,
        "maintainer.products.products-types.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Tipo de produto criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const typeProductId = req.params["typeProductId"] as string;
    const body = req.body as PatchMaintainerTypeProductInput;
    const row = await maintainerTypesProductsService.patch(
      typeProductId,
      body,
      auditContextFromRequest(
        req,
        "maintainer.products.products-types.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de produto atualizado com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const typeProductId = req.params["typeProductId"] as string;
    const row = await maintainerTypesProductsService.delete(
      typeProductId,
      auditContextFromRequest(
        req,
        "maintainer.products.products-types.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de produto excluido com sucesso.",
      data: row,
    });
  };
}

export const maintainerTypesProductsController =
  new MaintainerTypesProductsController();
