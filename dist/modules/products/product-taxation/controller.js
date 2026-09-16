import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { productTaxationService } from "./service.js";
export class ProductTaxationController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await productTaxationService.list(query);
        sendPageFromService(res, HttpStatus.OK, "Tributações de produto listadas com sucesso.", page);
    };
    getById = async (req, res) => {
        const productTaxationId = req.params["productTaxationId"];
        const row = await productTaxationService.getById(productTaxationId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tributação de produto recuperada com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const row = await productTaxationService.create(body, auditContextFromPostAuth(auth, req, "products.product-taxation.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Tributação de produto criada com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const productTaxationId = req.params["productTaxationId"];
        const body = req.body;
        const auth = req.auth;
        const row = await productTaxationService.patch(productTaxationId, body, auditContextFromPatchAuth(auth, req, "products.product-taxation.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tributação de produto atualizada com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const productTaxationId = req.params["productTaxationId"];
        const auth = req.auth;
        const row = await productTaxationService.delete(productTaxationId, auditContextFromDeleteAuth(auth, req, "products.product-taxation.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tributação de produto excluída com sucesso.",
            data: row,
        });
    };
}
export const productTaxationController = new ProductTaxationController();
