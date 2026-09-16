import { auditContextFromPostRequest, auditContextFromRequest, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { addressesCountriesService } from "./service.js";
export class AddressesCountriesController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await addressesCountriesService.list(query);
        sendPageFromService(res, HttpStatus.OK, "Paises listados com sucesso.", page);
    };
    create = async (req, res) => {
        const body = req.body;
        const row = await addressesCountriesService.create(body, auditContextFromPostRequest(req, "addresses.countries.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "País criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const countryId = req.params["countryId"];
        const body = req.body;
        const row = await addressesCountriesService.patch(countryId, body, auditContextFromRequest(req, "addresses.countries.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "País atualizado com sucesso.",
            data: row,
        });
    };
}
export const addressesCountriesController = new AddressesCountriesController();
