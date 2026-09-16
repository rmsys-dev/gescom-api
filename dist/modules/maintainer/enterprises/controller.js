import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import { auditContextFromPostAuth, auditContextFromRequest, } from "../../../shared/audit/request-meta.js";
import { maintainerEnterprisesService } from "./service.js";
export class MaintainerEnterprisesController {
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const row = await maintainerEnterprisesService.create(body, auth.userId, auditContextFromPostAuth(auth, req, "maintainer.enterprises.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Empresa criada com sucesso.",
            data: row,
        });
    };
    patchParameters = async (req, res) => {
        const id = req.params["enterpriseId"];
        const body = req.body;
        const data = await maintainerEnterprisesService.patchParameters(id, body, auditContextFromRequest(req, "maintainer.enterprises.service.patchParameters", { enterpriseId: id }));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Parametros da empresa atualizados com sucesso.",
            data,
        });
    };
    remove = async (req, res) => {
        const id = req.params["enterpriseId"];
        const row = await maintainerEnterprisesService.softDelete(id, auditContextFromRequest(req, "maintainer.enterprises.service.softDelete", { enterpriseId: id }));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Empresa removida com sucesso.",
            data: row,
        });
    };
}
export const maintainerEnterprisesController = new MaintainerEnterprisesController();
