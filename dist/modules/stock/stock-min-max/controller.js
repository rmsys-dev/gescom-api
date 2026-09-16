import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { stockMinMaxService } from "./service.js";
export class StockMinMaxController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const page = await stockMinMaxService.list(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Estoque min/max listado com sucesso.", page);
    };
    getById = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const stockMinMaxId = req.params["stockMinMaxId"];
        const row = await stockMinMaxService.getById(enterpriseId, stockMinMaxId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Estoque min/max recuperado com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await stockMinMaxService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "stock.stock-min-max.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Estoque min/max criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const stockMinMaxId = req.params["stockMinMaxId"];
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await stockMinMaxService.patch(enterpriseId, stockMinMaxId, body, auditContextFromPatchAuth(auth, req, "stock.stock-min-max.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Estoque min/max atualizado com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const stockMinMaxId = req.params["stockMinMaxId"];
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await stockMinMaxService.delete(enterpriseId, stockMinMaxId, auditContextFromDeleteAuth(auth, req, "stock.stock-min-max.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Estoque min/max excluido com sucesso.",
            data: row,
        });
    };
}
export const stockMinMaxController = new StockMinMaxController();
