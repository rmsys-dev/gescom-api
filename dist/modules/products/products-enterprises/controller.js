import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { productsEnterprisesService } from "./service.js";
export class ProductsEnterprisesController {
    list = async (req, res) => {
        const query = req.validatedQuery;
        const page = await productsEnterprisesService.list(requireTenantEnterpriseId(req.auth), query);
        sendPageFromService(res, HttpStatus.OK, "Produtos da empresa listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const productEnterpriseId = req.params["productEnterpriseId"];
        const row = await productsEnterprisesService.getById(requireTenantEnterpriseId(req.auth), productEnterpriseId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Produto da empresa recuperado com sucesso.",
            data: row,
        });
    };
    getByCode = async (req, res) => {
        const code = Number(req.params["code"]);
        const row = await productsEnterprisesService.getByCode(requireTenantEnterpriseId(req.auth), code);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Produto da empresa recuperado com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const reqAuth = req;
        const auth = reqAuth.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const body = req.body;
        const row = await productsEnterprisesService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "products.products-enterprises.service.create", { enterpriseId }));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Produto da empresa criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const reqAuth = req;
        const auth = reqAuth.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const productEnterpriseId = req.params["productEnterpriseId"];
        const body = req.body;
        const row = await productsEnterprisesService.patch(enterpriseId, productEnterpriseId, body, auditContextFromPatchAuth(auth, req, "products.products-enterprises.service.patch", { enterpriseId }));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Produto da empresa atualizado com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const reqAuth = req;
        const auth = reqAuth.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const productEnterpriseId = req.params["productEnterpriseId"];
        const row = await productsEnterprisesService.delete(enterpriseId, productEnterpriseId, auditContextFromDeleteAuth(auth, req, "products.products-enterprises.service.delete", { enterpriseId }));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Produto da empresa excluído com sucesso.",
            data: row,
        });
    };
}
export const productsEnterprisesController = new ProductsEnterprisesController();
