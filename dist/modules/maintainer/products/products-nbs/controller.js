import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import { auditContextFromPostRequest, auditContextFromRequest, } from "../../../../shared/audit/request-meta.js";
import { maintainerProductsNbsService } from "./service.js";
export class MaintainerProductsNbsController {
    create = async (req, res) => {
        const body = req.body;
        const row = await maintainerProductsNbsService.create(body, auditContextFromPostRequest(req, "maintainer.products.products-nbs.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "NBS de produto criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const productsNbsId = req.params["productsNbsId"];
        const body = req.body;
        const row = await maintainerProductsNbsService.patch(productsNbsId, body, auditContextFromRequest(req, "maintainer.products.products-nbs.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "NBS de produto atualizado com sucesso.",
            data: row,
        });
    };
    remove = async (req, res) => {
        const productsNbsId = req.params["productsNbsId"];
        const row = await maintainerProductsNbsService.delete(productsNbsId, auditContextFromRequest(req, "maintainer.products.products-nbs.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "NBS de produto excluÃ­do com sucesso.",
            data: row,
        });
    };
}
export const maintainerProductsNbsController = new MaintainerProductsNbsController();
