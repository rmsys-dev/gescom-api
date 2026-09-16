import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { pricesService } from "./service.js";
export class PricesController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await pricesService.list(requireTenantEnterpriseId(req.auth), query);
        sendPageFromService(res, HttpStatus.OK, "Preços listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const priceId = req.params["priceId"];
        const row = await pricesService.getById(requireTenantEnterpriseId(req.auth), priceId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Preço recuperado com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const reqAuth = req;
        const auth = reqAuth.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const body = req.body;
        const row = await pricesService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "products.prices.service.create", { enterpriseId }));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Preço criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const reqAuth = req;
        const auth = reqAuth.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const priceId = req.params["priceId"];
        const body = req.body;
        const row = await pricesService.patch(enterpriseId, priceId, body, auditContextFromPatchAuth(auth, req, "products.prices.service.patch", { enterpriseId }));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Preço atualizado com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const reqAuth = req;
        const auth = reqAuth.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const priceId = req.params["priceId"];
        const row = await pricesService.delete(enterpriseId, priceId, auditContextFromDeleteAuth(auth, req, "products.prices.service.delete", { enterpriseId }));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Preço excluído com sucesso.",
            data: row,
        });
    };
}
export const pricesController = new PricesController();
