import { HttpStatus } from "../../../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../../../shared/responses/send-success-response.js";
import { auditContextFromPostRequest, auditContextFromRequest, } from "../../../../shared/audit/request-meta.js";
import { maintainerTypesProductsService } from "./service.js";
export class MaintainerTypesProductsController {
    create = async (req, res) => {
        const body = req.body;
        const row = await maintainerTypesProductsService.create(body, auditContextFromPostRequest(req, "maintainer.products.products-types.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Tipo de produto criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const typeProductId = req.params["typeProductId"];
        const body = req.body;
        const row = await maintainerTypesProductsService.patch(typeProductId, body, auditContextFromRequest(req, "maintainer.products.products-types.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tipo de produto atualizado com sucesso.",
            data: row,
        });
    };
    remove = async (req, res) => {
        const typeProductId = req.params["typeProductId"];
        const row = await maintainerTypesProductsService.delete(typeProductId, auditContextFromRequest(req, "maintainer.products.products-types.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tipo de produto excluido com sucesso.",
            data: row,
        });
    };
}
export const maintainerTypesProductsController = new MaintainerTypesProductsController();
