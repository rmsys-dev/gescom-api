import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromPostAuth } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendListSuccessResponse, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { salesReturnsService } from "./service.js";
export class SalesReturnsController {
    list = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const saleId = req.params["saleId"];
        const result = await salesReturnsService.list(enterpriseId, saleId);
        sendListSuccessResponse(res, "Devolucoes da venda listadas com sucesso.", result.items);
    };
    getById = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const saleId = req.params["saleId"];
        const salesReturnId = req.params["salesReturnId"];
        const data = await salesReturnsService.getById(enterpriseId, saleId, salesReturnId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Devolucao recuperada com sucesso.",
            data,
        });
    };
    createPartial = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const saleId = req.params["saleId"];
        const body = req.body;
        const data = await salesReturnsService.createPartialReturn(enterpriseId, saleId, auth.userId ?? "", body, auditContextFromPostAuth(auth, req, "sales.returns.service.createPartial"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Devolucao parcial registrada com sucesso.",
            data,
        });
    };
    createFull = async (req, res) => {
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const saleId = req.params["saleId"];
        const body = req.body;
        const data = await salesReturnsService.createFullReturn(enterpriseId, saleId, auth.userId ?? "", body, auditContextFromPostAuth(auth, req, "sales.returns.service.createFull"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Devolucao total registrada com sucesso.",
            data,
        });
    };
}
export const salesReturnsController = new SalesReturnsController();
