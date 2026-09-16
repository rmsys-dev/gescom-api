import { auditContextFromPostRequest, auditContextFromRequest, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { addressesStatesService } from "./service.js";
export class AddressesStatesController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await addressesStatesService.list(query);
        sendPageFromService(res, HttpStatus.OK, "Estados listados com sucesso.", page);
    };
    create = async (req, res) => {
        const body = req.body;
        const row = await addressesStatesService.create(body, auditContextFromPostRequest(req, "addresses.states.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Estado criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const stateId = req.params["stateId"];
        const body = req.body;
        const row = await addressesStatesService.patch(stateId, body, auditContextFromRequest(req, "addresses.states.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Estado atualizado com sucesso.",
            data: row,
        });
    };
}
export const addressesStatesController = new AddressesStatesController();
