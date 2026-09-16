import { requireTenantEnterpriseId } from "../../../shared/controllers/tenant-context.js";
import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { vehiclesEnterprisesMembersService } from "./service.js";
export class VehiclesEnterprisesMembersController {
    list = async (req, res) => {
        const query = req.validatedQuery;
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const page = await vehiclesEnterprisesMembersService.list(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Vinculos veiculo/membro listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const enterpriseId = requireTenantEnterpriseId(req.auth);
        const vehiclesEnterprisesMemberId = req.params["vehiclesEnterprisesMemberId"];
        const row = await vehiclesEnterprisesMembersService.getById(enterpriseId, vehiclesEnterprisesMemberId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Vinculo veiculo/membro recuperado com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await vehiclesEnterprisesMembersService.create(enterpriseId, body, auditContextFromPostAuth(auth, req, "vehicles.vehicles-enterprises-members.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Vinculo veiculo/membro criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const vehiclesEnterprisesMemberId = req.params["vehiclesEnterprisesMemberId"];
        const body = req.body;
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await vehiclesEnterprisesMembersService.patch(enterpriseId, vehiclesEnterprisesMemberId, body, auditContextFromPatchAuth(auth, req, "vehicles.vehicles-enterprises-members.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Vinculo veiculo/membro atualizado com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const vehiclesEnterprisesMemberId = req.params["vehiclesEnterprisesMemberId"];
        const auth = req.auth;
        const enterpriseId = requireTenantEnterpriseId(auth);
        const row = await vehiclesEnterprisesMembersService.delete(enterpriseId, vehiclesEnterprisesMemberId, auditContextFromDeleteAuth(auth, req, "vehicles.vehicles-enterprises-members.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Vinculo veiculo/membro inativado com sucesso.",
            data: row,
        });
    };
}
export const vehiclesEnterprisesMembersController = new VehiclesEnterprisesMembersController();
