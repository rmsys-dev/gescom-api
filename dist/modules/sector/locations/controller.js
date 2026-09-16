import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { locationsService } from "../locations/service.js";
export class LocationsController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const page = await locationsService.list(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Locacoes fisicas de estoque listadas com sucesso.", page);
    };
    getById = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const locationId = req.params["locationId"];
        const row = await locationsService.getById(enterpriseId, locationId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Locacao fisica de estoque recuperada com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await locationsService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "sector.locations.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Locacao fisica de estoque criada com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const locationId = req.params["locationId"];
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await locationsService.patch(enterpriseId, locationId, body, auditContextFromPatchAuth(auth, req, "sector.locations.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Locacao fisica de estoque atualizada com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const locationId = req.params["locationId"];
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await locationsService.delete(enterpriseId, locationId, auditContextFromDeleteAuth(auth, req, "sector.locations.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Locacao fisica de estoque excluida com sucesso.",
            data: row,
        });
    };
}
export const locationsController = new LocationsController();
