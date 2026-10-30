import type { Request, Response } from "express";
import type { EntityAuditContext } from "../../../shared/audit/entity-audit.js";
import {
  auditContextFromAuth,
  auditMetaFromRequest,
  withPostAuditSource,
} from "../../../shared/audit/request-meta.js";
import { BadRequestError } from "../../../shared/errors/app-error.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import type { LancarEntradaInput } from "./entrada-schema.js";
import { nfeEntradaService } from "./entrada-service.js";

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

const auditOf = (req: Request): EntityAuditContext => {
  const authReq = req as RequestWithAuth;
  return auditContextFromAuth(
    authReq.auth,
    auditMetaFromRequest(req),
    withPostAuditSource("/nfe/compras/:nfeId/lancar"),
    { enterpriseId: authReq.auth.enterpriseId },
  );
};

export class NfeEntradaController {
  public pendentes = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeEntradaService.listarPendentes(requireEnterpriseId(req));
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Notas de compra pendentes de lancamento.",
      data,
    });
  };

  public dispensadas = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeEntradaService.listarDispensadas(requireEnterpriseId(req));
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Notas de compra dispensadas da entrada.",
      data,
    });
  };

  public dispensar = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeEntradaService.dispensar(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Nota dispensada da lista de entrada. O XML permanece na pasta.",
      data,
    });
  };

  public repor = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeEntradaService.repor(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Nota devolvida a lista de entrada.",
      data,
    });
  };

  public conhecimentos = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeEntradaService.conhecimentos(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Conhecimentos de transporte da nota.",
      data,
    });
  };

  public previa = async (req: Request, res: Response): Promise<void> => {
    const data = await nfeEntradaService.previa(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Previa da entrada de compra.",
      data,
    });
  };

  public lancar = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth;
    const data = await nfeEntradaService.lancar(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
      req.body as LancarEntradaInput,
      auth.userId,
      auditOf(req),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Nota de compra lancada.",
      data,
    });
  };

  public excluir = async (req: Request, res: Response): Promise<void> => {
    const auth = (req as RequestWithAuth).auth;
    const data = await nfeEntradaService.excluir(
      requireEnterpriseId(req),
      req.params["nfeId"] as string,
      auth.userId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Lancamento da nota de compra excluido.",
      data,
    });
  };
}

export const nfeEntradaController = new NfeEntradaController();
