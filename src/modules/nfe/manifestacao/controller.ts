import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import { BadRequestError } from "../../../shared/errors/app-error.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import { nfeManifestacaoService } from "./service.js";
import type { CreateManifestacaoInput, ListManifestacoesQuery } from "./schema.js";

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

export class NfeManifestacaoController {
  public create = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeManifestacaoService.create(
      requireEnterpriseId(req),
      req.body as CreateManifestacaoInput,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Manifestacao do destinatario registrada na SEFAZ.",
      data,
    });
  };

  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListManifestacoesQuery>)
      .validatedQuery;
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Manifestacoes do destinatario listadas com sucesso.",
      await nfeManifestacaoService.list(requireEnterpriseId(req), query),
    );
  };

  public xml = async (req: Request, res: Response): Promise<void> => {
    const { xml } = await nfeManifestacaoService.xml(
      requireEnterpriseId(req),
      req.params["manifestacaoId"] as string,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "XML da manifestacao carregado com sucesso.",
      data: { xml },
    });
  };
}

export const nfeManifestacaoController = new NfeManifestacaoController();
