import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { productApplicationsService } from "./service.js";
export class ProductApplicationsController {
    list = async (req, res) => {
        const query = req.validatedQuery;
        const page = await productApplicationsService.list(requireTenantEnterpriseId(req.auth), query);
        sendPageFromService(res, HttpStatus.OK, "Aplicações de produto listadas com sucesso.", page);
    };
    listById = async (req, res) => {
        const id = req.params["id"];
        const row = await productApplicationsService.getById(requireTenantEnterpriseId(req.auth), id);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Aplicação de produto recuperada com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const reqAuth = req;
        const auth = reqAuth.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const body = req.body;
        const row = await productApplicationsService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "products.product-applications.service.create", { enterpriseId }));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Aplicação de produto criada com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const reqAuth = req;
        const auth = reqAuth.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const id = req.params["id"];
        const body = req.body;
        const row = await productApplicationsService.patch(enterpriseId, id, body, auditContextFromPatchAuth(auth, req, "products.product-applications.service.patch", { enterpriseId }));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Aplicação de produto atualizada com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const reqAuth = req;
        const auth = reqAuth.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const id = req.params["id"];
        const row = await productApplicationsService.delete(enterpriseId, id, auditContextFromDeleteAuth(auth, req, "products.product-applications.service.delete", { enterpriseId }));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Aplicação de produto excluída com sucesso.",
            data: row,
        });
    };
}
export const productApplicationsController = new ProductApplicationsController();
