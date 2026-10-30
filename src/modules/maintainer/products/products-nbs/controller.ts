import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import type {
  CreateMaintainerProductsNbsInput,
  PatchMaintainerProductsNbsInput,
} from "./schema.js";
import { maintainerProductsNbsService } from "./service.js";

export class MaintainerProductsNbsController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMaintainerProductsNbsInput;
    const row = await maintainerProductsNbsService.create(
      body,
      auditContextFromPostRequest(
        req,
        "maintainer.products.products-nbs.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "NBS de produto criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const productsNbsId = req.params["productsNbsId"] as string;
    const body = req.body as PatchMaintainerProductsNbsInput;
    const row = await maintainerProductsNbsService.patch(
      productsNbsId,
      body,
      auditContextFromRequest(req, "maintainer.products.products-nbs.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "NBS de produto atualizado com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const productsNbsId = req.params["productsNbsId"] as string;
    const row = await maintainerProductsNbsService.delete(
      productsNbsId,
      auditContextFromRequest(req, "maintainer.products.products-nbs.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "NBS de produto excluÃ­do com sucesso.",
      data: row,
    });
  };
}

export const maintainerProductsNbsController =
  new MaintainerProductsNbsController();
