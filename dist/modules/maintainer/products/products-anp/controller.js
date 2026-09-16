import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import { auditContextFromPostRequest, auditContextFromRequest, } from "../../../../shared/audit/request-meta.js";
import { maintainerProductsAnpService } from "./service.js";
export class MaintainerProductsAnpController {
    create = async (req, res) => {
        const body = req.body;
        const row = await maintainerProductsAnpService.create(body, auditContextFromPostRequest(req, "maintainer.products.products-anp.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "ANP de produto criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const productsAnpId = req.params["productsAnpId"];
        const body = req.body;
        const row = await maintainerProductsAnpService.patch(productsAnpId, body, auditContextFromRequest(req, "maintainer.products.products-anp.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "ANP de produto atualizado com sucesso.",
            data: row,
        });
    };
    remove = async (req, res) => {
        const productsAnpId = req.params["productsAnpId"];
        const row = await maintainerProductsAnpService.delete(productsAnpId, auditContextFromRequest(req, "maintainer.products.products-anp.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "ANP de produto excluÃ­do com sucesso.",
            data: row,
        });
    };
}
export const maintainerProductsAnpController = new MaintainerProductsAnpController();
