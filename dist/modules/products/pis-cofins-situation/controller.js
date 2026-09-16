import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { pisCofinsSituationService } from "./service.js";
export class PisCofinsSituationController {
    list = async (req, res) => {
        const query = req.validatedQuery;
        const page = await pisCofinsSituationService.list(query);
        sendPageFromService(res, HttpStatus.OK, "Situações PIS/COFINS listadas com sucesso.", page);
    };
    getById = async (req, res) => {
        const pisCofinsSituationId = req.params["pisCofinsSituationId"];
        const row = await pisCofinsSituationService.getById(pisCofinsSituationId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Situação PIS/COFINS recuperada com sucesso.",
            data: row,
        });
    };
}
export const pisCofinsSituationController = new PisCofinsSituationController();
