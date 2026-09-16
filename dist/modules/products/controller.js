import { requireTenantEnterpriseId } from "../../shared/controllers/tenant-context.js";
import { auditContextFromPostAuth } from "../../shared/audit/request-meta.js";
import { HttpStatus } from "../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../shared/responses/send-success-response.js";
import { productsService } from "./service.js";
export class ProductsController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await productsService.list(query);
        sendPageFromService(res, HttpStatus.OK, "Produtos listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const productId = req.params["productId"];
        const row = await productsService.getById(productId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Produto recuperado com sucesso.",
            data: row,
        });
    };
    /**
     * POST /products: cria produto+vínculo ou, se o barCode (ou a descrição sem
     * barCode) já existir, apenas o snapshot em products-enterprises
     * (`linkedExistingProduct`) — espelha create-with-user de membros.
     */
    create = async (req, res) => {
        const body = req.body;
        const reqAuth = req;
        const auth = reqAuth.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await productsService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "products.service.create", {
            enterpriseId,
        }));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: row.linkedExistingProduct
                ? "Produto encontrado. Vinculo com a empresa criado com sucesso."
                : "Produto e vinculo com a empresa criados com sucesso.",
            data: row,
        });
    };
}
export const productsController = new ProductsController();
