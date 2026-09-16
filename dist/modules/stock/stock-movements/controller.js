import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromPostAuth } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { stockMovementsService } from "./service.js";
export class StockMovementsController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const page = await stockMovementsService.list(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Movimentos de estoque listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const stockMovementId = req.params["stockMovementId"];
        const row = await stockMovementsService.getById(enterpriseId, stockMovementId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Movimento de estoque recuperado com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await stockMovementsService.create(enterpriseId, auth.userId ?? null, body, auditContextFromPostAuth(auth, req, "stock.stock-movements.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Movimento de estoque registrado com sucesso.",
            data: row,
        });
    };
}
export const stockMovementsController = new StockMovementsController();
