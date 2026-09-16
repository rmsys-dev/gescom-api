import { HttpStatus } from "../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../shared/responses/send-success-response.js";
import { modulesService } from "./service.js";
export class ModulesController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await modulesService.list(query);
        sendPageFromService(res, HttpStatus.OK, "Modulos listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const moduleId = req.params["moduleId"];
        const row = await modulesService.getById(moduleId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Modulo recuperado com sucesso.",
            data: row,
        });
    };
}
export const modulesController = new ModulesController();
