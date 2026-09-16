import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { sectorsService } from "./service.js";
export class SectorsController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const page = await sectorsService.list(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Setores de estoque listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const sectorId = req.params["sectorId"];
        const row = await sectorsService.getById(enterpriseId, sectorId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Setor de estoque recuperado com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await sectorsService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "sector.sectors.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Setor de estoque criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const sectorId = req.params["sectorId"];
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await sectorsService.patch(enterpriseId, sectorId, body, auditContextFromPatchAuth(auth, req, "sector.sectors.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Setor de estoque atualizado com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const sectorId = req.params["sectorId"];
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await sectorsService.delete(enterpriseId, sectorId, auditContextFromDeleteAuth(auth, req, "sector.sectors.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Setor de estoque excluido com sucesso.",
            data: row,
        });
    };
}
export const sectorsController = new SectorsController();
