import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import { auditContextFromPostRequest, auditContextFromRequest, } from "../../../../shared/audit/request-meta.js";
import { maintainerIcmsTaxationService } from "./service.js";
export class MaintainerIcmsTaxationController {
    create = async (req, res) => {
        const body = req.body;
        const row = await maintainerIcmsTaxationService.create(body, auditContextFromPostRequest(req, "maintainer.products.icms-taxation.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "TributaÃ§Ã£o ICMS criada com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const icmsTaxationId = req.params["icmsTaxationId"];
        const body = req.body;
        const row = await maintainerIcmsTaxationService.patch(icmsTaxationId, body, auditContextFromRequest(req, "maintainer.products.icms-taxation.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "TributaÃ§Ã£o ICMS atualizada com sucesso.",
            data: row,
        });
    };
    remove = async (req, res) => {
        const icmsTaxationId = req.params["icmsTaxationId"];
        const row = await maintainerIcmsTaxationService.delete(icmsTaxationId, auditContextFromRequest(req, "maintainer.products.icms-taxation.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "TributaÃ§Ã£o ICMS excluÃ­da com sucesso.",
            data: row,
        });
    };
}
export const maintainerIcmsTaxationController = new MaintainerIcmsTaxationController();
