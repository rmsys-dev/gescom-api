import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { promotionalPricesService } from "./service.js";
export class PromotionalPricesController {
    list = async (req, res) => {
        const query = req.validatedQuery;
        const page = await promotionalPricesService.list(requireTenantEnterpriseId(req.auth), query);
        sendPageFromService(res, HttpStatus.OK, "Preços promocionais listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const promotionalPriceId = req.params["promotionalPriceId"];
        const row = await promotionalPricesService.getById(requireTenantEnterpriseId(req.auth), promotionalPriceId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Preço promocional recuperado com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const reqAuth = req;
        const auth = reqAuth.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const body = req.body;
        const row = await promotionalPricesService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "products.promotional-prices.service.create", { enterpriseId }));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Preço promocional criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const reqAuth = req;
        const auth = reqAuth.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const promotionalPriceId = req.params["promotionalPriceId"];
        const body = req.body;
        const row = await promotionalPricesService.patch(enterpriseId, promotionalPriceId, body, auditContextFromPatchAuth(auth, req, "products.promotional-prices.service.patch", { enterpriseId }));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Preço promocional atualizado com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const reqAuth = req;
        const auth = reqAuth.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const promotionalPriceId = req.params["promotionalPriceId"];
        const row = await promotionalPricesService.delete(enterpriseId, promotionalPriceId, auditContextFromDeleteAuth(auth, req, "products.promotional-prices.service.delete", { enterpriseId }));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Preço promocional excluído com sucesso.",
            data: row,
        });
    };
}
export const promotionalPricesController = new PromotionalPricesController();
