import type { Request, Response } from "express";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithAuth } from "../../shared/middleware/auth-middleware.js";
import type { RequestWithValidatedQuery } from "../../shared/middleware/validate-schema.js";
import { sendSuccessResponse } from "../../shared/responses/send-success-response.js";
import { BadRequestError } from "../../shared/errors/app-error.js";
import {
  auditContextFromRequest,
  withPatchAuditSource,
  withPostAuditSource,
} from "../../shared/audit/request-meta.js";
import { nfeParametersService } from "./parameters/service.js";
import { nfeConfiguracaoService } from "./configuracao/service.js";
import type { PatchNfeConfiguracaoInput } from "./configuracao/schema.js";
import { nfeCertificadoUploadSchema } from "./configuracao/schema.js";
import type { StatusServicoQuery } from "./schema.js";
import { nfeService } from "./service.js";

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

export class NfeController {
  public statusServico = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<StatusServicoQuery>)
      .validatedQuery;
    const data = await nfeService.consultarStatusServico(
      query,
      requireEnterpriseId(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Status do servico da SEFAZ consultado com sucesso.",
      data,
    });
  };

  public listParameters = async (
    _req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await nfeParametersService.list();
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Parametros globais de NF-e listados com sucesso.",
      data,
    });
  };

  public getConfiguracao = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await nfeConfiguracaoService.get(requireEnterpriseId(req));
    sendSuccessResponse(res, HttpStatus.OK, {
      message: data.certificado?.alerta
        ? `Configuracao de NF-e recuperada com sucesso. ${data.certificado.alerta}`
        : "Configuracao de NF-e recuperada com sucesso.",
      data,
    });
  };

  public patchConfiguracao = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const enterpriseId = requireEnterpriseId(req);
    const body = req.body as PatchNfeConfiguracaoInput;
    const data = await nfeConfiguracaoService.patch(
      enterpriseId,
      body,
      auditContextFromRequest(
        req,
        withPatchAuditSource("nfe.configuracao.service.patch"),
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Configuracao de NF-e atualizada com sucesso.",
      data,
    });
  };

  public listCertificados = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const data = await nfeConfiguracaoService.listCertificates(
      requireEnterpriseId(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Certificados digitais listados com sucesso.",
      data,
    });
  };

  public uploadCertificado = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const file = req.file;
    if (!file?.buffer) {
      throw new BadRequestError(
        "Envie o arquivo PFX no campo 'pfx'",
        "NFE_CERT_FILE_REQUIRED",
      );
    }
    const parsed = nfeCertificadoUploadSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new BadRequestError(
        "Informe a senha do certificado digital",
        "NFE_CERT_PASSWORD_REQUIRED",
      );
    }
    const enterpriseId = requireEnterpriseId(req);
    const data = await nfeConfiguracaoService.uploadCertificate(
      enterpriseId,
      {
        pfx: file.buffer,
        fileName: file.originalname,
        password: parsed.data.password,
      },
      auditContextFromRequest(
        req,
        withPostAuditSource("nfe.configuracao.service.uploadCertificate"),
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: data.certificado?.alerta
        ? `Certificado digital atualizado com sucesso. ${data.certificado.alerta}`
        : "Certificado digital atualizado com sucesso.",
      data,
    });
  };
}

export const nfeController = new NfeController();
