import type { Request, Response } from "express";
import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import type { RequestWithAuth } from "../../../shared/middleware/auth-middleware.js";
import type { RequestWithUserReadAccess } from "../../../shared/middleware/user-read-access-middleware.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import {
  auditContextFromPatchAuth,
  auditContextFromPostAuth,
} from "../../../shared/audit/request-meta.js";
import { usersOnboardingService } from "./service.js";
import type {
  PersonalInfoCreateInput,
  PersonalInfoPatchInput,
  UsersAddressCreateInput,
  UsersAddressPatchInput,
  UsersContactCreateInput,
  UsersContactPatchInput,
  UsersFinancialInfoCreateInput,
  UsersFinancialInfoPatchInput,
  UsersRelationshipsCreateInput,
  UsersRelationshipsPatchInput,
  UsersTaxInfosCreateInput,
  UsersTaxInfosPatchInput,
} from "./schema.js";

const ONBOARDING_MESSAGES = {
  detailsRead: "Dados de onboarding recuperados com sucesso.",
  created: "Recurso de onboarding criado com sucesso.",
  updated: "Recurso de onboarding atualizado com sucesso.",
} as const;

const getOnboardingWriteContext = (req: Request) => {
  const reqAuth = req as RequestWithAuth;
  return {
    enterpriseId: requireTenantEnterpriseId(reqAuth.auth),
    userId: req.params["userId"] as string,
  };
};

const onboardingPostAudit = (
  req: Request,
  enterpriseId: string,
  source: string,
) =>
  auditContextFromPostAuth(
    (req as RequestWithAuth).auth,
    req,
    source,
    { enterpriseId },
  );

const onboardingPatchAudit = (
  req: Request,
  enterpriseId: string,
  source: string,
) =>
  auditContextFromPatchAuth(
    (req as RequestWithAuth).auth,
    req,
    source,
    { enterpriseId },
  );

const respondOnboardingCreated = (
  res: Response,
  data: unknown,
): void => {
  sendSuccessResponse(res, HttpStatus.CREATED, {
    message: ONBOARDING_MESSAGES.created,
    data,
  });
};

const respondOnboardingUpdated = (
  res: Response,
  data: unknown,
): void => {
  sendSuccessResponse(res, HttpStatus.OK, {
    message: ONBOARDING_MESSAGES.updated,
    data,
  });
};

export class UsersOnboardingController {
  public getUsersWithDetails = async (req: Request, res: Response) => {
    const reqWithRead = req as RequestWithUserReadAccess;
    const { targetUserId, readMode } = reqWithRead.userReadAccess;
    const enterpriseId = requireTenantEnterpriseId(reqWithRead.auth);

    const payload = await usersOnboardingService.getUsersWithDetails(
      targetUserId,
      enterpriseId,
      readMode,
    );
    sendSuccessResponse(res, HttpStatus.OK, {
      message: ONBOARDING_MESSAGES.detailsRead,
      data: payload,
    });
  };

  public createPersonalInfo = async (req: Request, res: Response) => {
    const { enterpriseId, userId } = getOnboardingWriteContext(req);
    const body = req.body as PersonalInfoCreateInput;
    const row = await usersOnboardingService.createPersonalInfo(
      enterpriseId,
      userId,
      body,
      onboardingPostAudit(req, enterpriseId, "users.onboarding.createPersonalInfo"),
    );
    respondOnboardingCreated(res, row);
  };

  public patchPersonalInfo = async (req: Request, res: Response) => {
    const { enterpriseId, userId } = getOnboardingWriteContext(req);
    const body = req.body as PersonalInfoPatchInput;
    const row = await usersOnboardingService.patchPersonalInfo(
      enterpriseId,
      userId,
      body,
      onboardingPatchAudit(req, enterpriseId, "users.onboarding.patchPersonalInfo"),
    );
    respondOnboardingUpdated(res, row);
  };

  public createAddress = async (req: Request, res: Response) => {
    const { enterpriseId, userId } = getOnboardingWriteContext(req);
    const body = req.body as UsersAddressCreateInput;
    const row = await usersOnboardingService.createAddress(
      enterpriseId,
      userId,
      body,
      onboardingPostAudit(req, enterpriseId, "users.onboarding.createAddress"),
    );
    respondOnboardingCreated(res, row);
  };

  public patchAddress = async (req: Request, res: Response) => {
    const { enterpriseId, userId } = getOnboardingWriteContext(req);
    const addressId = req.params["addressId"] as string;
    const body = req.body as UsersAddressPatchInput;
    const row = await usersOnboardingService.patchAddress(
      enterpriseId,
      userId,
      addressId,
      body,
      onboardingPatchAudit(req, enterpriseId, "users.onboarding.patchAddress"),
    );
    respondOnboardingUpdated(res, row);
  };

  public createContact = async (req: Request, res: Response) => {
    const { enterpriseId, userId } = getOnboardingWriteContext(req);
    const body = req.body as UsersContactCreateInput;
    const row = await usersOnboardingService.createContact(
      enterpriseId,
      userId,
      body,
      onboardingPostAudit(req, enterpriseId, "users.onboarding.createContact"),
    );
    respondOnboardingCreated(res, row);
  };

  public patchContact = async (req: Request, res: Response) => {
    const { enterpriseId, userId } = getOnboardingWriteContext(req);
    const contactId = req.params["contactId"] as string;
    const body = req.body as UsersContactPatchInput;
    const row = await usersOnboardingService.patchContact(
      enterpriseId,
      userId,
      contactId,
      body,
      onboardingPatchAudit(req, enterpriseId, "users.onboarding.patchContact"),
    );
    respondOnboardingUpdated(res, row);
  };

  public createRelationships = async (req: Request, res: Response) => {
    const { enterpriseId, userId } = getOnboardingWriteContext(req);
    const body = req.body as UsersRelationshipsCreateInput;
    const row = await usersOnboardingService.createRelationships(
      enterpriseId,
      userId,
      body,
      onboardingPostAudit(req, enterpriseId, "users.onboarding.createRelationships"),
    );
    respondOnboardingCreated(res, row);
  };

  public patchRelationships = async (req: Request, res: Response) => {
    const { enterpriseId, userId } = getOnboardingWriteContext(req);
    const body = req.body as UsersRelationshipsPatchInput;
    const row = await usersOnboardingService.patchRelationships(
      enterpriseId,
      userId,
      body,
      onboardingPatchAudit(req, enterpriseId, "users.onboarding.patchRelationships"),
    );
    respondOnboardingUpdated(res, row);
  };

  public createTaxInfos = async (req: Request, res: Response) => {
    const { enterpriseId, userId } = getOnboardingWriteContext(req);
    const body = req.body as UsersTaxInfosCreateInput;
    const row = await usersOnboardingService.createTaxInfos(
      enterpriseId,
      userId,
      body,
      onboardingPostAudit(req, enterpriseId, "users.onboarding.createTaxInfos"),
    );
    respondOnboardingCreated(res, row);
  };

  public patchTaxInfos = async (req: Request, res: Response) => {
    const { enterpriseId, userId } = getOnboardingWriteContext(req);
    const body = req.body as UsersTaxInfosPatchInput;
    const row = await usersOnboardingService.patchTaxInfos(
      enterpriseId,
      userId,
      body,
      onboardingPatchAudit(req, enterpriseId, "users.onboarding.patchTaxInfos"),
    );
    respondOnboardingUpdated(res, row);
  };

  public createFinancialInfo = async (req: Request, res: Response) => {
    const { enterpriseId, userId } = getOnboardingWriteContext(req);
    const body = req.body as UsersFinancialInfoCreateInput;
    const row = await usersOnboardingService.createFinancialInfo(
      enterpriseId,
      userId,
      body,
      onboardingPostAudit(req, enterpriseId, "users.onboarding.createFinancialInfo"),
    );
    respondOnboardingCreated(res, row);
  };

  public patchFinancialInfo = async (req: Request, res: Response) => {
    const { enterpriseId, userId } = getOnboardingWriteContext(req);
    const body = req.body as UsersFinancialInfoPatchInput;
    const row = await usersOnboardingService.patchFinancialInfo(
      enterpriseId,
      userId,
      body,
      onboardingPatchAudit(req, enterpriseId, "users.onboarding.patchFinancialInfo"),
    );
    respondOnboardingUpdated(res, row);
  };
}

export const usersOnboardingController = new UsersOnboardingController();
