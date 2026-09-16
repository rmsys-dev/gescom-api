import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { typesProductsService } from "./service.js";
export class TypesProductsController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await typesProductsService.list(query);
        sendPageFromService(res, HttpStatus.OK, "Tipos de produto listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const typeProductId = req.params["typeProductId"];
        const row = await typesProductsService.getById(typeProductId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tipo de produto recuperado com sucesso.",
            data: row,
        });
    };
}
export const typesProductsController = new TypesProductsController();
