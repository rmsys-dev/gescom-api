import { auditContextFromPostRequest, auditContextFromRequest, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { addressesCepsService } from "./service.js";
export class AddressesCepsController {
    list = async (req, res) => {
        const query = req.validatedQuery;
        const page = await addressesCepsService.list(query);
        sendPageFromService(res, HttpStatus.OK, "CEPs listados com sucesso.", page);
    };
    create = async (req, res) => {
        const body = req.body;
        const row = await addressesCepsService.create(body, auditContextFromPostRequest(req, "addresses.ceps.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "CEP criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const cepId = req.params["cepId"];
        const body = req.body;
        const row = await addressesCepsService.patch(cepId, body, auditContextFromRequest(req, "addresses.ceps.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "CEP atualizado com sucesso.",
            data: row,
        });
    };
}
export const addressesCepsController = new AddressesCepsController();
