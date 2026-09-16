import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { vehiclesService } from "./service.js";
export class VehiclesController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await vehiclesService.list(query);
        sendPageFromService(res, HttpStatus.OK, "Veiculos listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const vehicleId = req.params["vehicleId"];
        const row = await vehiclesService.getById(vehicleId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Veiculo recuperado com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const row = await vehiclesService.create(body, auditContextFromPostAuth(auth, req, "vehicles.vehicles.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Veiculo criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const vehicleId = req.params["vehicleId"];
        const body = req.body;
        const auth = req.auth;
        const row = await vehiclesService.patch(vehicleId, body, auditContextFromPatchAuth(auth, req, "vehicles.vehicles.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Veiculo atualizado com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const vehicleId = req.params["vehicleId"];
        const auth = req.auth;
        const row = await vehiclesService.delete(vehicleId, auditContextFromDeleteAuth(auth, req, "vehicles.vehicles.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Veiculo excluido com sucesso.",
            data: row,
        });
    };
}
export const vehiclesController = new VehiclesController();
