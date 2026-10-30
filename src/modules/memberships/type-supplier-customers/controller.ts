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
  CreateTypeSupplierCustomerInput,
  ListTypeSupplierCustomersQuery,
  PatchTypeSupplierCustomerInput,
} from "./schema.js";
import { typeSupplierCustomersService } from "./service.js";

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

export class TypeSupplierCustomersController {
  public list = async (req: Request, res: Response): Promise<void> => {
    const query = (
      req as RequestWithValidatedQuery<ListTypeSupplierCustomersQuery>
    ).validatedQuery;
    const page = await typeSupplierCustomersService.list(
      requireEnterpriseId(req),
      query,
    );
    sendPageFromService(
      res,
      HttpStatus.OK,
      "Tipos de fornecedor/cliente listados com sucesso.",
      page,
    );
  };

  public getById = async (req: Request, res: Response): Promise<void> => {
    const typeSupplierCustomerId = req.params[
      "typeSupplierCustomerId"
    ] as string;
    const row = await typeSupplierCustomersService.getById(
      requireEnterpriseId(req),
      typeSupplierCustomerId,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de fornecedor/cliente recuperado com sucesso.",
      data: row,
    });
  };

  public create = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireEnterpriseId(req);
    const body = req.body as CreateTypeSupplierCustomerInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await typeSupplierCustomersService.create(
      enterpriseId,
      body,
      auditContextFromPostAuth(
        auth,
        req,
        "memberships.type-supplier-customers.service.create",
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.CREATED, {
      message: "Tipo de fornecedor/cliente criado com sucesso.",
      data: row,
    });
  };

  public patch = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireEnterpriseId(req);
    const typeSupplierCustomerId = req.params[
      "typeSupplierCustomerId"
    ] as string;
    const body = req.body as PatchTypeSupplierCustomerInput;
    const auth = (req as RequestWithAuth).auth!;
    const row = await typeSupplierCustomersService.patch(
      enterpriseId,
      typeSupplierCustomerId,
      body,
      auditContextFromPatchAuth(
        auth,
        req,
        "memberships.type-supplier-customers.service.patch",
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de fornecedor/cliente atualizado com sucesso.",
      data: row,
    });
  };

  public delete = async (req: Request, res: Response): Promise<void> => {
    const enterpriseId = requireEnterpriseId(req);
    const typeSupplierCustomerId = req.params[
      "typeSupplierCustomerId"
    ] as string;
    const auth = (req as RequestWithAuth).auth!;
    const row = await typeSupplierCustomersService.delete(
      enterpriseId,
      typeSupplierCustomerId,
      auditContextFromDeleteAuth(
        auth,
        req,
        "memberships.type-supplier-customers.service.delete",
        { enterpriseId },
      ),
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Tipo de fornecedor/cliente excluido com sucesso.",
      data: row,
    });
  };
}

export const typeSupplierCustomersController =
  new TypeSupplierCustomersController();
