import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { productsNbsService } from "./service.js";
export class ProductsNbsController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await productsNbsService.list(query);
        sendPageFromService(res, HttpStatus.OK, "NBS de produtos listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const productsNbsId = req.params["productsNbsId"];
        const row = await productsNbsService.getById(productsNbsId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "NBS de produto recuperado com sucesso.",
            data: row,
        });
    };
}
export const productsNbsController = new ProductsNbsController();
