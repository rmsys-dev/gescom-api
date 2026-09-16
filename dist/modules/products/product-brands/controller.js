import { HttpStatus } from "../../../shared/http/http-status.js";
import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { productBrandsService } from "./service.js";
export class ProductBrandsController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const enterpriseId = req.params["enterpriseId"] ??
            requireTenantEnterpriseId(req.auth);
        const page = await productBrandsService.list(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Marcas de produto listadas com sucesso.", page);
    };
    getById = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const productBrandId = req.params["productBrandId"];
        const row = await productBrandsService.getById(enterpriseId, productBrandId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Marca de produto recuperada com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const body = req.body;
        const row = await productBrandsService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "products.product-brands.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Marca de produto criada com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const productBrandId = req.params["productBrandId"];
        const body = req.body;
        const row = await productBrandsService.patch(enterpriseId, productBrandId, body, auditContextFromPatchAuth(auth, req, "products.product-brands.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Marca de produto atualizada com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const productBrandId = req.params["productBrandId"];
        const row = await productBrandsService.delete(enterpriseId, productBrandId, auditContextFromDeleteAuth(auth, req, "products.product-brands.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Marca de produto excluída com sucesso.",
            data: row,
        });
    };
}
export const productBrandsController = new ProductBrandsController();
