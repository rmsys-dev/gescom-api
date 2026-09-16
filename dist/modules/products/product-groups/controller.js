import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { productGroupsService } from "./service.js";
export class ProductGroupsController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const enterpriseId = req.params["enterpriseId"] ??
            requireTenantEnterpriseId(req.auth);
        const page = await productGroupsService.list(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Grupos de produto listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const productGroupId = req.params["productGroupId"];
        const row = await productGroupsService.getById(enterpriseId, productGroupId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Grupo de produto recuperado com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await productGroupsService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "products.product-groups.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Grupo de produto criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const productGroupId = req.params["productGroupId"];
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await productGroupsService.patch(enterpriseId, productGroupId, body, auditContextFromPatchAuth(auth, req, "products.product-groups.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Grupo de produto atualizado com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const productGroupId = req.params["productGroupId"];
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await productGroupsService.delete(enterpriseId, productGroupId, auditContextFromDeleteAuth(auth, req, "products.product-groups.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Grupo de produto excluído com sucesso.",
            data: row,
        });
    };
}
export const productGroupsController = new ProductGroupsController();
