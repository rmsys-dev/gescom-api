import type { Request, Response } from "express";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
import {
  auditContextFromDeleteAuth,
  auditContextFromPatchAuth,
  auditContextFromPostAuth,
} from "../../../shared/audit/request-meta.js";
import { BadRequestError } from "../../../shared/errors/app-error.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type {
  CreateTypeNetworkInput,
  ListTypeNetworksQuery,
  PatchTypeNetworkInput,
} from "./schema.js";
import { typeNetworksService } from "./service.js";

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

export class TypeNetworksController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListTypeNetworksQuery>)
      .validatedQuery;
    const page = await typeNetworksService.list(
      requireEnterpriseId(req),
      query,
    );
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Tipos de rede listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const typeNetworkId = req.params["typeNetworkId"] as string;
    const row = await typeNetworksService.getById(
      requireEnterpriseId(req),
      typeNetworkId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de rede recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireEnterpriseId(req);
    const body = req.body as CreateTypeNetworkInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await typeNetworksService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "memberships.type-networks.service.create",
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Tipo de rede criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireEnterpriseId(req);
    const typeNetworkId = req.params["typeNetworkId"] as string;
    const body = req.body as PatchTypeNetworkInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await typeNetworksService.patch(
      enterpriseId,
      typeNetworkId,
      body,
      auditContextFromPatchAuth(
        auth,
        req,
        "memberships.type-networks.service.patch",
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de rede atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireEnterpriseId(req);
    const typeNetworkId = req.params["typeNetworkId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const row = await typeNetworksService.delete(
      enterpriseId,
      typeNetworkId,
      auditContextFromDeleteAuth(
        auth,
        req,
        "memberships.type-networks.service.delete",
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de rede excluido com sucesso.",
      data: row,
    });
  };
}

export const typeNetworksController = new TypeNetworksController();
