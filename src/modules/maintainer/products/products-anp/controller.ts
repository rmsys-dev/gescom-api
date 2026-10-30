import type { Request, Response } from "express";
import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import {
  auditContextFromPostRequest,
  auditContextFromRequest,
} from "../../../../shared/audit/request-meta.js";
import type {
  CreateMaintainerProductsAnpInput,
  PatchMaintainerProductsAnpInput,
} from "./schema.js";
import { maintainerProductsAnpService } from "./service.js";

export class MaintainerProductsAnpController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateMaintainerProductsAnpInput;
    const row = await maintainerProductsAnpService.create(
      body,
      auditContextFromPostRequest(
        req,
        "maintainer.products.products-anp.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "ANP de produto criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const productsAnpId = req.params["productsAnpId"] as string;
    const body = req.body as PatchMaintainerProductsAnpInput;
    const row = await maintainerProductsAnpService.patch(
      productsAnpId,
      body,
      auditContextFromRequest(req, "maintainer.products.products-anp.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "ANP de produto atualizado com sucesso.",
      data: row,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const productsAnpId = req.params["productsAnpId"] as string;
    const row = await maintainerProductsAnpService.delete(
      productsAnpId,
      auditContextFromRequest(req, "maintainer.products.products-anp.service.delete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "ANP de produto excluÃ­do com sucesso.",
      data: row,
    });
  };
}

export const maintainerProductsAnpController =
  new MaintainerProductsAnpController();
