import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import type {
  CreateMaintainerProductsNcmInput,
  PatchMaintainerProductsNcmInput,
} from "./schema.js";
import { maintainerProductsNcmService } from "./service.js";

export class MaintainerProductsNcmController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMaintainerProductsNcmInput;
    const row = await maintainerProductsNcmService.create(
      body,
      auditContextFromPostRequest(
        req,
        "maintainer.products.products-ncm.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "NCM de produto criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const productsNcmId = req.params["productsNcmId"] as string;
    const body = req.body as PatchMaintainerProductsNcmInput;
    const row = await maintainerProductsNcmService.patch(
      productsNcmId,
      body,
      auditContextFromRequest(req, "maintainer.products.products-ncm.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "NCM de produto atualizado com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const productsNcmId = req.params["productsNcmId"] as string;
    const row = await maintainerProductsNcmService.delete(
      productsNcmId,
      auditContextFromRequest(req, "maintainer.products.products-ncm.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "NCM de produto excluÃ­do com sucesso.",
      data: row,
    });
  };
}

export const maintainerProductsNcmController =
  new MaintainerProductsNcmController();
