import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { productsCestService } from "./service.js";
export class ProductsCestController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await productsCestService.list(query);
        sendPageFromService(res, HttpStatus.OK, "CEST de produtos listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const productsCestId = req.params["productsCestId"];
        const row = await productsCestService.getById(productsCestId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "CEST de produto recuperado com sucesso.",
            data: row,
        });
    };
}
export const productsCestController = new ProductsCestController();
