import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import { auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { usersOnboardingService } from "./service.js";
const ONBOARDING_MESSAGES = {
    detailsRead: "Dados de onboarding recuperados com sucesso.",
    created: "Recurso de onboarding criado com sucesso.",
    updated: "Recurso de onboarding atualizado com sucesso.",
};
const getOnboardingWriteContext = (req) => {
    const reqAuth = req;
    return {
        enterpriseId: requireTenantEnterpriseId(reqAuth.auth),
        userId: req.params["userId"],
    };
};
const onboardingPostAudit = (req, enterpriseId, source) => auditContextFromPostAuth(req.auth, req, source, { enterpriseId });
const onboardingPatchAudit = (req, enterpriseId, source) => auditContextFromPatchAuth(req.auth, req, source, { enterpriseId });
const respondOnboardingCreated = (res, data) => {
    sendSuccessResponse(res, HttpStatus.CREATED, {
        message: ONBOARDING_MESSAGES.created,
        data,
    });
};
const respondOnboardingUpdated = (res, data) => {
    sendSuccessResponse(res, HttpStatus.OK, {
        message: ONBOARDING_MESSAGES.updated,
        data,
    });
};
export class UsersOnboardingController {
    getUsersWithDetails = async (req, res) => {
        const reqWithRead = req;
        const { targetUserId, readMode } = reqWithRead.userReadAccess;
        const enterpriseId = requireTenantEnterpriseId(reqWithRead.auth);
        const payload = await usersOnboardingService.getUsersWithDetails(targetUserId, enterpriseId, readMode);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: ONBOARDING_MESSAGES.detailsRead,
            data: payload,
        });
    };
    createPersonalInfo = async (req, res) => {
        const { enterpriseId, userId } = getOnboardingWriteContext(req);
        const body = req.body;
        const row = await usersOnboardingService.createPersonalInfo(enterpriseId, userId, body, onboardingPostAudit(req, enterpriseId, "users.onboarding.createPersonalInfo"));
        respondOnboardingCreated(res, row);
    };
    patchPersonalInfo = async (req, res) => {
        const { enterpriseId, userId } = getOnboardingWriteContext(req);
        const body = req.body;
        const row = await usersOnboardingService.patchPersonalInfo(enterpriseId, userId, body, onboardingPatchAudit(req, enterpriseId, "users.onboarding.patchPersonalInfo"));
        respondOnboardingUpdated(res, row);
    };
    createAddress = async (req, res) => {
        const { enterpriseId, userId } = getOnboardingWriteContext(req);
        const body = req.body;
        const row = await usersOnboardingService.createAddress(enterpriseId, userId, body, onboardingPostAudit(req, enterpriseId, "users.onboarding.createAddress"));
        respondOnboardingCreated(res, row);
    };
    patchAddress = async (req, res) => {
        const { enterpriseId, userId } = getOnboardingWriteContext(req);
        const addressId = req.params["addressId"];
        const body = req.body;
        const row = await usersOnboardingService.patchAddress(enterpriseId, userId, addressId, body, onboardingPatchAudit(req, enterpriseId, "users.onboarding.patchAddress"));
        respondOnboardingUpdated(res, row);
    };
    createContact = async (req, res) => {
        const { enterpriseId, userId } = getOnboardingWriteContext(req);
        const body = req.body;
        const row = await usersOnboardingService.createContact(enterpriseId, userId, body, onboardingPostAudit(req, enterpriseId, "users.onboarding.createContact"));
        respondOnboardingCreated(res, row);
    };
    patchContact = async (req, res) => {
        const { enterpriseId, userId } = getOnboardingWriteContext(req);
        const contactId = req.params["contactId"];
        const body = req.body;
        const row = await usersOnboardingService.patchContact(enterpriseId, userId, contactId, body, onboardingPatchAudit(req, enterpriseId, "users.onboarding.patchContact"));
        respondOnboardingUpdated(res, row);
    };
    createRelationships = async (req, res) => {
        const { enterpriseId, userId } = getOnboardingWriteContext(req);
        const body = req.body;
        const row = await usersOnboardingService.createRelationships(enterpriseId, userId, body, onboardingPostAudit(req, enterpriseId, "users.onboarding.createRelationships"));
        respondOnboardingCreated(res, row);
    };
    patchRelationships = async (req, res) => {
        const { enterpriseId, userId } = getOnboardingWriteContext(req);
        const body = req.body;
        const row = await usersOnboardingService.patchRelationships(enterpriseId, userId, body, onboardingPatchAudit(req, enterpriseId, "users.onboarding.patchRelationships"));
        respondOnboardingUpdated(res, row);
    };
    createTaxInfos = async (req, res) => {
        const { enterpriseId, userId } = getOnboardingWriteContext(req);
        const body = req.body;
        const row = await usersOnboardingService.createTaxInfos(enterpriseId, userId, body, onboardingPostAudit(req, enterpriseId, "users.onboarding.createTaxInfos"));
        respondOnboardingCreated(res, row);
    };
    patchTaxInfos = async (req, res) => {
        const { enterpriseId, userId } = getOnboardingWriteContext(req);
        const body = req.body;
        const row = await usersOnboardingService.patchTaxInfos(enterpriseId, userId, body, onboardingPatchAudit(req, enterpriseId, "users.onboarding.patchTaxInfos"));
        respondOnboardingUpdated(res, row);
    };
    createFinancialInfo = async (req, res) => {
        const { enterpriseId, userId } = getOnboardingWriteContext(req);
        const body = req.body;
        const row = await usersOnboardingService.createFinancialInfo(enterpriseId, userId, body, onboardingPostAudit(req, enterpriseId, "users.onboarding.createFinancialInfo"));
        respondOnboardingCreated(res, row);
    };
    patchFinancialInfo = async (req, res) => {
        const { enterpriseId, userId } = getOnboardingWriteContext(req);
        const body = req.body;
        const row = await usersOnboardingService.patchFinancialInfo(enterpriseId, userId, body, onboardingPatchAudit(req, enterpriseId, "users.onboarding.patchFinancialInfo"));
        respondOnboardingUpdated(res, row);
    };
}
export const usersOnboardingController = new UsersOnboardingController();
