import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import { auditContextFromPostRequest, auditContextFromRequest, } from "../../../../shared/audit/request-meta.js";
import { maintainerTypeSpedService } from "./service.js";
export class MaintainerTypeSpedController {
    create = async (req, res) => {
        const body = req.body;
        const row = await maintainerTypeSpedService.create(body, auditContextFromPostRequest(req, "maintainer.products.type-sped.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Tipo SPED criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const typeSpedId = req.params["typeSpedId"];
        const body = req.body;
        const row = await maintainerTypeSpedService.patch(typeSpedId, body, auditContextFromRequest(req, "maintainer.products.type-sped.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tipo SPED atualizado com sucesso.",
            data: row,
        });
    };
    remove = async (req, res) => {
        const typeSpedId = req.params["typeSpedId"];
        const row = await maintainerTypeSpedService.delete(typeSpedId, auditContextFromRequest(req, "maintainer.products.type-sped.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tipo SPED excluido com sucesso.",
            data: row,
        });
    };
}
export const maintainerTypeSpedController = new MaintainerTypeSpedController();
