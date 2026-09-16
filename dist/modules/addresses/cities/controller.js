import { auditContextFromPostRequest, auditContextFromRequest, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { addressesCitiesService } from "./service.js";
export class AddressesCitiesController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await addressesCitiesService.list(query);
        sendPageFromService(res, HttpStatus.OK, "Cidades listadas com sucesso.", page);
    };
    create = async (req, res) => {
        const body = req.body;
        const row = await addressesCitiesService.create(body, auditContextFromPostRequest(req, "addresses.cities.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Cidade criada com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const cityId = req.params["cityId"];
        const body = req.body;
        const row = await addressesCitiesService.patch(cityId, body, auditContextFromRequest(req, "addresses.cities.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Cidade atualizada com sucesso.",
            data: row,
        });
    };
}
export const addressesCitiesController = new AddressesCitiesController();
