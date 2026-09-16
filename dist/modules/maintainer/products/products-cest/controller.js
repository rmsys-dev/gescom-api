import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import { auditContextFromPostRequest, auditContextFromRequest, } from "../../../../shared/audit/request-meta.js";
import { maintainerProductsCestService } from "./service.js";
export class MaintainerProductsCestController {
    create = async (req, res) => {
        const body = req.body;
        const row = await maintainerProductsCestService.create(body, auditContextFromPostRequest(req, "maintainer.products.products-cest.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "CEST de produto criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const productsCestId = req.params["productsCestId"];
        const body = req.body;
        const row = await maintainerProductsCestService.patch(productsCestId, body, auditContextFromRequest(req, "maintainer.products.products-cest.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "CEST de produto atualizado com sucesso.",
            data: row,
        });
    };
    remove = async (req, res) => {
        const productsCestId = req.params["productsCestId"];
        const row = await maintainerProductsCestService.delete(productsCestId, auditContextFromRequest(req, "maintainer.products.products-cest.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "CEST de produto excluÃ­do com sucesso.",
            data: row,
        });
    };
}
export const maintainerProductsCestController = new MaintainerProductsCestController();
