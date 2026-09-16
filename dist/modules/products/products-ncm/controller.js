import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { productsNcmService } from "./service.js";
export class ProductsNcmController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await productsNcmService.list(query);
        sendPageFromService(res, HttpStatus.OK, "NCM de produtos listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const productsNcmId = req.params["productsNcmId"];
        const row = await productsNcmService.getById(productsNcmId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "NCM de produto recuperado com sucesso.",
            data: row,
        });
    };
}
export const productsNcmController = new ProductsNcmController();
