import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import { auditContextFromPostRequest, auditContextFromRequest, } from "../../../../shared/audit/request-meta.js";
import { maintainerProductsNcmService } from "./service.js";
export class MaintainerProductsNcmController {
    create = async (req, res) => {
        const body = req.body;
        const row = await maintainerProductsNcmService.create(body, auditContextFromPostRequest(req, "maintainer.products.products-ncm.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "NCM de produto criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const productsNcmId = req.params["productsNcmId"];
        const body = req.body;
        const row = await maintainerProductsNcmService.patch(productsNcmId, body, auditContextFromRequest(req, "maintainer.products.products-ncm.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "NCM de produto atualizado com sucesso.",
            data: row,
        });
    };
    remove = async (req, res) => {
        const productsNcmId = req.params["productsNcmId"];
        const row = await maintainerProductsNcmService.delete(productsNcmId, auditContextFromRequest(req, "maintainer.products.products-ncm.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "NCM de produto excluÃ­do com sucesso.",
            data: row,
        });
    };
}
export const maintainerProductsNcmController = new MaintainerProductsNcmController();
