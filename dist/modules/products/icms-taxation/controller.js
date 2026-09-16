import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { icmsTaxationService } from "./service.js";
export class IcmsTaxationController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await icmsTaxationService.list(query);
        sendPageFromService(res, HttpStatus.OK, "Tributações ICMS listadas com sucesso.", page);
    };
    getById = async (req, res) => {
        const icmsTaxationId = req.params["icmsTaxationId"];
        const row = await icmsTaxationService.getById(icmsTaxationId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tributação ICMS recuperada com sucesso.",
            data: row,
        });
    };
}
export const icmsTaxationController = new IcmsTaxationController();
