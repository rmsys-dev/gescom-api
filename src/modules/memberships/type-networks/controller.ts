import type { Request, Response } from "express";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
import {
  auditContextFromDeleteAuth,
  auditContextFromPatchAuth,
  auditContextFromPostAuth,
} from "../../../shared/audit/request-meta.js";
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

export class TypeNetworksController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (req as RequestWithValidatedQuery<ListTypeNetworksQuery>)
      .validatedQuery;
    const page = await typeNetworksService.list(query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Tipos de rede listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const typeNetworkId = req.params["typeNetworkId"] as string;
    const row = await typeNetworksService.getById(typeNetworkId);
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de rede recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as CreateTypeNetworkInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await typeNetworksService.create(
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "memberships.type-networks.service.create",
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Tipo de rede criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const typeNetworkId = req.params["typeNetworkId"] as string;
    const body = req.body as PatchTypeNetworkInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await typeNetworksService.patch(
      typeNetworkId,
      body,
      auditContextFromPatchAuth(
        auth,
        req,
        "memberships.type-networks.service.patch",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de rede atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const typeNetworkId = req.params["typeNetworkId"] as string;
    const auth = (req as RequestWithAuth).auth!;
    const row = await typeNetworksService.delete(
      typeNetworkId,
      auditContextFromDeleteAuth(
        auth,
        req,
        "memberships.type-networks.service.delete",
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de rede excluido com sucesso.",
      data: row,
    });
  };
}

export const typeNetworksController = new TypeNetworksController();
