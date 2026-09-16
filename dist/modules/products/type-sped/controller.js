import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { typeSpedService } from "./service.js";
export class TypeSpedController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await typeSpedService.list(query);
        sendPageFromService(res, HttpStatus.OK, "Tipos SPED listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const typeSpedId = req.params["typeSpedId"];
        const row = await typeSpedService.getById(typeSpedId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tipo SPED recuperado com sucesso.",
            data: row,
        });
    };
}
export const typeSpedController = new TypeSpedController();
