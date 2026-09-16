import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { mechanicSalesItemsService } from "./service.js";
export class MechanicSalesItemsController {
    list = async (req, res) => {
        const query = req.validatedQuery;
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const page = await mechanicSalesItemsService.list(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Comissoes de mecanicos listadas com sucesso.", page);
    };
    getById = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const mechanicSalesItemId = req.params["mechanicSalesItemId"];
        const row = await mechanicSalesItemsService.getById(enterpriseId, mechanicSalesItemId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Comissao de mecanico recuperada com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await mechanicSalesItemsService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "vehicles.mechanic-sales-items.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Comissao de mecanico criada com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const mechanicSalesItemId = req.params["mechanicSalesItemId"];
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await mechanicSalesItemsService.patch(enterpriseId, mechanicSalesItemId, body, auditContextFromPatchAuth(auth, req, "vehicles.mechanic-sales-items.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Comissao de mecanico atualizada com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const mechanicSalesItemId = req.params["mechanicSalesItemId"];
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await mechanicSalesItemsService.delete(enterpriseId, mechanicSalesItemId, auditContextFromDeleteAuth(auth, req, "vehicles.mechanic-sales-items.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Comissao de mecanico excluida com sucesso.",
            data: row,
        });
    };
}
export const mechanicSalesItemsController = new MechanicSalesItemsController();
