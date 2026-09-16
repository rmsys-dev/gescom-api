import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../shared/responses/send-success-response.js";
import { auditContextFromPostRequest, auditContextFromRequest, } from "../../../shared/audit/request-meta.js";
import { maintainerModulesService } from "./service.js";
export class MaintainerModulesController {
    create = async (req, res) => {
        const body = req.body;
        const row = await maintainerModulesService.create(body, auditContextFromPostRequest(req, "maintainer.modules.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Modulo criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const moduleId = req.params["moduleId"];
        const body = req.body;
        const row = await maintainerModulesService.patch(moduleId, body, auditContextFromRequest(req, "maintainer.modules.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Modulo atualizado com sucesso.",
            data: row,
        });
    };
}
export const maintainerModulesController = new MaintainerModulesController();
