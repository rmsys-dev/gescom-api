import { HttpStatus } from "../../../shared/http/http-status.js";
import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { productSubgroupsService } from "./service.js";
export class ProductSubgroupsController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const enterpriseId = req.params["enterpriseId"] ??
            requireTenantEnterpriseId(req.auth);
        const page = await productSubgroupsService.list(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Subgrupos de produto listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const productSubgroupId = req.params["productSubgroupId"];
        const row = await productSubgroupsService.getById(enterpriseId, productSubgroupId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Subgrupo de produto recuperado com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const body = req.body;
        const row = await productSubgroupsService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "products.product-subgroups.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Subgrupo de produto criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const productSubgroupId = req.params["productSubgroupId"];
        const body = req.body;
        const row = await productSubgroupsService.patch(enterpriseId, productSubgroupId, body, auditContextFromPatchAuth(auth, req, "products.product-subgroups.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Subgrupo de produto atualizado com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const productSubgroupId = req.params["productSubgroupId"];
        const row = await productSubgroupsService.delete(enterpriseId, productSubgroupId, auditContextFromDeleteAuth(auth, req, "products.product-subgroups.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Subgrupo de produto excluído com sucesso.",
            data: row,
        });
    };
}
export const productSubgroupsController = new ProductSubgroupsController();
