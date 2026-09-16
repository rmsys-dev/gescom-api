import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { sectorsRentalService } from "./service.js";
export class SectorsRentalController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const page = await sectorsRentalService.list(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Locacoes de estoque listadas com sucesso.", page);
    };
    getById = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const sectorRentalId = req.params["sectorRentalId"];
        const row = await sectorsRentalService.getById(enterpriseId, sectorRentalId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Locacao de estoque recuperada com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await sectorsRentalService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "sector.sectors-rental.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Locacao de estoque criada com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const sectorRentalId = req.params["sectorRentalId"];
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await sectorsRentalService.patch(enterpriseId, sectorRentalId, body, auditContextFromPatchAuth(auth, req, "sector.sectors-rental.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Locacao de estoque atualizada com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const sectorRentalId = req.params["sectorRentalId"];
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await sectorsRentalService.delete(enterpriseId, sectorRentalId, auditContextFromDeleteAuth(auth, req, "sector.sectors-rental.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Locacao de estoque excluida com sucesso.",
            data: row,
        });
    };
}
export const sectorsRentalController = new SectorsRentalController();
