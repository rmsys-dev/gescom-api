import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
import { BadRequestError } from "../../../shared/errors/app-error.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import { cteDistribuicaoService } from "./cte-service.js";
import { nfeCompraXmlService } from "./service.js";
import type { ConsultarCompraChaveInput } from "./schema.js";

const requireEnterpriseId = (req: Request): string => {
  const enterpriseId = (req as RequestWithAuth).auth.enterpriseId;
  if (!enterpriseId) {
    throw new BadRequestError(
      "Contexto de empresa ausente para esta operacao",
      "TENANT_SCOPE_REQUIRED",
    );
  }
  return enterpriseId;
};

export class NfeCompraXmlController {
  public porChave = async (req: Request, res: Response): Promise<void> => {
    const { chave } = req.body as ConsultarCompraChaveInput;
    const data = await nfeCompraXmlService.porChave(
      requireEnterpriseId(req),
      chave,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "XML da nota de compra gravado.",
      data,
    });
  };

  public sincronizarCte = async (req: Request, res: Response): Promise<void> => {
    const data = await cteDistribuicaoService.sincronizar(requireEnterpriseId(req));
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Distribuicao de CT-e consultada.",
      data,
    });
  };

  public sincronizar = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeCompraXmlService.sincronizar(requireEnterpriseId(req));
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Distribuicao de DF-e consultada.",
      data,
    });
  };

  public upload = async (req: Request, res: Response): Promise<void> => {
    const file = req.file;
    if (!file?.buffer?.length) {
      throw new BadRequestError(
        "Envie o procNFe do fornecedor no campo 'xml'",
        "NFE_COMPRA_XML_INVALID",
      );
    }
    const data = await nfeCompraXmlService.upload(
      requireEnterpriseId(req),
      file.buffer.toString("utf8"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "XML da nota de compra gravado.",
      data,
    });
  };
}

export const nfeCompraXmlController = new NfeCompraXmlController();
