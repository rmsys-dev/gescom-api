import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import { auditContextFromRequest } from "../../../shared/audit/request-meta.js";
import type {
  CreateEnterpriseGroupInput,
  PatchEnterpriseGroupInput,
  SetEnterpriseGroupInput,
} from "./schema.js";
import { maintainerEnterpriseGroupsService } from "./service.js";

export class MaintainerEnterpriseGroupsController {
  public list = async (_req: Request, res: Response): Promise<void> => {
    const data = await maintainerEnterpriseGroupsService.list();
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Grupos de empresas listados com sucesso.",
      data,
    });
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const data = await maintainerEnterpriseGroupsService.getById(
      req.params["groupId"] as string,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Grupo de empresas encontrado.",
      data,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const data = await maintainerEnterpriseGroupsService.create(
      req.body as CreateEnterpriseGroupInput,
      auditContextFromRequest(req, "maintainer.enterpriseGroups.service.create"),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Grupo de empresas criado com sucesso.",
      data,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const data = await maintainerEnterpriseGroupsService.patch(
      req.params["groupId"] as string,
      req.body as PatchEnterpriseGroupInput,
      auditContextFromRequest(req, "maintainer.enterpriseGroups.service.patch"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Grupo de empresas atualizado com sucesso.",
      data,
    });
  };

  public remove = async (req: Request, res: Response): Promise<void> => {
    const data = await maintainerEnterpriseGroupsService.softDelete(
      req.params["groupId"] as string,
      auditContextFromRequest(req, "maintainer.enterpriseGroups.service.softDelete"),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Grupo de empresas removido com sucesso.",
      data,
    });
  };

  public setEnterpriseGroup = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = req.params["enterpriseId"] as string;
    const body = req.body as SetEnterpriseGroupInput;
    const data = await maintainerEnterpriseGroupsService.setEnterpriseGroup(
      enterpriseId,
      body.groupId,
      auditContextFromRequest(
        req,
        "maintainer.enterpriseGroups.service.setEnterpriseGroup",
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: body.groupId
        ? "Empresa vinculada ao grupo com sucesso."
        : "Empresa desvinculada do grupo com sucesso.",
      data,
    });
  };
}

export const maintainerEnterpriseGroupsController =
  new MaintainerEnterpriseGroupsController();
