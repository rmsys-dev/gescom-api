import type { Request, Response } from "express";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithValidatedQuery } from "../../../shared/middleware/validate-schema.js";
import {
  sendPageFromService,
  sendSuccessResponse,
} from "../../../shared/responses/send-success-response.js";
import type {
  CreateEnterpriseAddressInput,
  ListEnterpriseAddressesQuery,
  PatchEnterpriseAddressInput,
} from "./schema.js";
import { auditContextFromRequest } from "../../../shared/audit/request-meta.js";
import { enterpriseAddressesService } from "./service.js";

export class EnterpriseAddressesController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = req.params["enterpriseId"] as string;
    const query = (
      req as RequestWithValidatedQuery<ListEnterpriseAddressesQuery>
    ).validatedQuery;
    const page = await enterpriseAddressesService.list(enterpriseId, query);
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Endereços da empresa listados com sucesso.",
      page,
    );
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = req.params["enterpriseId"] as string;
    const body = req.body as CreateEnterpriseAddressInput;
    const row = await enterpriseAddressesService.create(enterpriseId, body);
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Endereço da empresa criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = req.params["enterpriseId"] as string;
    const addressId = req.params["addressId"] as string;
    const body = req.body as PatchEnterpriseAddressInput;
    const row = await enterpriseAddressesService.patch(
      enterpriseId,
      addressId,
      body,
      auditContextFromRequest(
        req,
        "enterprises.enterprise-addresses.service.patch",
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Endereço da empresa atualizado com sucesso.",
      data: row,
    });
  };
}

export const enterpriseAddressesController =
  new EnterpriseAddressesController();
