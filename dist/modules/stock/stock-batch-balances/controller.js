import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { stockBatchBalancesService } from "./service.js";
export class StockBatchBalancesController {
    list = async (req, res) => {
        const query = req.validatedQuery;
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const page = await stockBatchBalancesService.list(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Saldos de lote listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const stockBatchBalanceId = req.params["stockBatchBalanceId"];
        const row = await stockBatchBalancesService.getById(enterpriseId, stockBatchBalanceId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Saldo de lote recuperado com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await stockBatchBalancesService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "stock.stock-batch-balances.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Saldo de lote criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const stockBatchBalanceId = req.params["stockBatchBalanceId"];
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await stockBatchBalancesService.patch(enterpriseId, stockBatchBalanceId, body, auditContextFromPatchAuth(auth, req, "stock.stock-batch-balances.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Saldo de lote atualizado com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const stockBatchBalanceId = req.params["stockBatchBalanceId"];
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await stockBatchBalancesService.delete(enterpriseId, stockBatchBalanceId, auditContextFromDeleteAuth(auth, req, "stock.stock-batch-balances.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Saldo de lote excluido com sucesso.",
            data: row,
        });
    };
}
export const stockBatchBalancesController = new StockBatchBalancesController();
