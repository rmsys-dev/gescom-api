import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { typeNetworksService } from "./service.js";
export class TypeNetworksController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await typeNetworksService.list(query);
        sendPageFromService(res, HttpStatus.OK, "Tipos de rede listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const typeNetworkId = req.params["typeNetworkId"];
        const row = await typeNetworksService.getById(typeNetworkId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tipo de rede recuperado com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const row = await typeNetworksService.create(body, auditContextFromPostAuth(auth, req, "memberships.type-networks.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Tipo de rede criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const typeNetworkId = req.params["typeNetworkId"];
        const body = req.body;
        const auth = req.auth;
        const row = await typeNetworksService.patch(typeNetworkId, body, auditContextFromPatchAuth(auth, req, "memberships.type-networks.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tipo de rede atualizado com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const typeNetworkId = req.params["typeNetworkId"];
        const auth = req.auth;
        const row = await typeNetworksService.delete(typeNetworkId, auditContextFromDeleteAuth(auth, req, "memberships.type-networks.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tipo de rede excluido com sucesso.",
            data: row,
        });
    };
}
export const typeNetworksController = new TypeNetworksController();
