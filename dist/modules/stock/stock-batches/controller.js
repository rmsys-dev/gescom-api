import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { stockBatchesService } from "./service.js";
export class StockBatchesController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const page = await stockBatchesService.list(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Lotes de estoque listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const stockBatchId = req.params["stockBatchId"];
        const row = await stockBatchesService.getById(enterpriseId, stockBatchId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Lote de estoque recuperado com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await stockBatchesService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "stock.stock-batches.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Lote de estoque criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const stockBatchId = req.params["stockBatchId"];
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await stockBatchesService.patch(enterpriseId, stockBatchId, body, auditContextFromPatchAuth(auth, req, "stock.stock-batches.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Lote de estoque atualizado com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const stockBatchId = req.params["stockBatchId"];
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await stockBatchesService.delete(enterpriseId, stockBatchId, auditContextFromDeleteAuth(auth, req, "stock.stock-batches.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Lote de estoque excluido com sucesso.",
            data: row,
        });
    };
}
export const stockBatchesController = new StockBatchesController();
