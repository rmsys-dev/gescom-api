import { HttpStatus } from "../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../shared/responses/send-success-response.js";
import { auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../shared/audit/request-meta.js";
import { membershipsService } from "./service.js";
const meta = (req) => ({
    ipAddress: req.ip ?? null,
    userAgent: req.header("user-agent") ?? null,
    requestId: req.requestId ?? null,
});
const membershipPostAudit = (req, enterpriseId, source) => {
    const reqAuth = req;
    return auditContextFromPostAuth(reqAuth.auth, req, source, { enterpriseId });
};
const membershipPatchAudit = (req, enterpriseId, source) => {
    const reqAuth = req;
    return auditContextFromPatchAuth(reqAuth.auth, req, source, { enterpriseId });
};
export class MembershipsController {
    //Listagem de membros da empresa
    list = async (req, res) => {
        const enterpriseId = req.params["enterpriseId"];
        const query = req
            .validatedQuery;
        const page = await membershipsService.list(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Membros listados com sucesso.", page);
    };
    //Detalhe de membro por ID
    getById = async (req, res) => {
        const enterpriseId = req.params["enterpriseId"];
        const memberId = req.params["memberId"];
        const row = await membershipsService.getById(enterpriseId, memberId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Membro recuperado com sucesso.",
            data: row,
        });
    };
    //Detalhe de membro por código
    getByCode = async (req, res) => {
        const enterpriseId = req.params["enterpriseId"];
        const code = Number(req.params["code"]);
        const row = await membershipsService.getByCode(enterpriseId, code);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Membro recuperado com sucesso.",
            data: row,
        });
    };
    /** Vínculo a utilizador já existente (POST /members). */
    create = async (req, res) => {
        const reqAuth = req;
        const enterpriseId = req.params["enterpriseId"];
        const body = req.body;
        const row = await membershipsService.createMembership(enterpriseId, body, reqAuth.auth.userId, membershipPostAudit(req, enterpriseId, "memberships.service.createMembership"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Membro criado com sucesso.",
            data: row,
        });
    };
    /**
     * create-with-user: cria utilizador+membro ou, se CPF/e-mail/telefone já existirem,
     * apenas o vínculo PENDENTE (linkedExistingUser). Após aprovação, first-access.
     */
    createOnboard = async (req, res) => {
        const reqAuth = req;
        const enterpriseId = req.params["enterpriseId"];
        const body = req.body;
        const row = await membershipsService.createWithNewUser(enterpriseId, body, reqAuth.auth.userId, membershipPostAudit(req, enterpriseId, "memberships.service.createWithNewUser"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: row.linkedExistingUser
                ? "Usuario encontrado. Membro vinculado com sucesso."
                : "Membro e usuário criados com sucesso.",
            data: row,
        });
    };
    //Aprova cadastro de membro (PENDENTE → ATIVO; first-access após aprovação excepto CLIENTE)
    approve = async (req, res) => {
        const reqAuth = req;
        const enterpriseId = req.params["enterpriseId"];
        const memberId = req.params["memberId"];
        const result = await membershipsService.approveMembership(enterpriseId, memberId, reqAuth.auth.userId, meta(req), membershipPatchAudit(req, enterpriseId, "memberships.service.approveMembership"));
        const emailSuffix = result.emailSent === "FIRST_ACCESS"
            ? " E-mail de primeiro acesso enviado."
            : "";
        sendSuccessResponse(res, HttpStatus.OK, {
            message: `Membro aprovado com sucesso.${emailSuffix}`,
            data: result.member,
        });
    };
    //Altera um membro da empresa (soft delete quando `softDelete` é true)
    patch = async (req, res) => {
        const reqAuth = req;
        const enterpriseId = req.params["enterpriseId"];
        const memberId = req.params["memberId"];
        const body = req.body;
        const row = await membershipsService.patch(enterpriseId, memberId, body, reqAuth.auth, membershipPatchAudit(req, enterpriseId, "memberships.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Membro atualizado com sucesso.",
            data: row,
        });
    };
    patchModulePermission = async (req, res) => {
        const reqAuth = req;
        const enterpriseId = req.params["enterpriseId"];
        const memberId = req.params["memberId"];
        const memberModuleId = req.params["memberModuleId"];
        const permission = req.params["permission"];
        const body = req.body;
        const row = await membershipsService.patchMemberModulePermission(enterpriseId, memberId, memberModuleId, permission, body.status, reqAuth.auth.memberId ?? null, membershipPatchAudit(req, enterpriseId, "memberships.service.patchMemberModulePermission"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Permissao do membro atualizada com sucesso.",
            data: row,
        });
    };
    addModule = async (req, res) => {
        const reqAuth = req;
        const enterpriseId = req.params["enterpriseId"];
        const memberId = req.params["memberId"];
        const body = req.body;
        const row = await membershipsService.addModuleToMember(enterpriseId, memberId, body, reqAuth.auth.memberId ?? null, membershipPostAudit(req, enterpriseId, "memberships.service.addModuleToMember"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Modulo vinculado ao membro com sucesso.",
            data: row,
        });
    };
    patchModule = async (req, res) => {
        const reqAuth = req;
        const enterpriseId = req.params["enterpriseId"];
        const memberId = req.params["memberId"];
        const memberModuleId = req.params["memberModuleId"];
        const body = req.body;
        const row = await membershipsService.patchMemberModule(enterpriseId, memberId, memberModuleId, body, reqAuth.auth.memberId ?? null, membershipPatchAudit(req, enterpriseId, "memberships.service.patchMemberModule"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Vinculo membro-modulo atualizado com sucesso.",
            data: row,
        });
    };
}
export const membershipsController = new MembershipsController();
