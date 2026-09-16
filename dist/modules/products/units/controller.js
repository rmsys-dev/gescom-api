import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { unitsService } from "./service.js";
export class UnitsController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await unitsService.list(query);
        sendPageFromService(res, HttpStatus.OK, "Unidades de medida listadas com sucesso.", page);
    };
    getById = async (req, res) => {
        const unitId = req.params["unitId"];
        const row = await unitsService.getById(unitId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Unidade de medida recuperada com sucesso.",
            data: row,
        });
    };
}
export const unitsController = new UnitsController();
