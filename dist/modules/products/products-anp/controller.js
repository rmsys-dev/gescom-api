import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { productsAnpService } from "./service.js";
export class ProductsAnpController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await productsAnpService.list(query);
        sendPageFromService(res, HttpStatus.OK, "ANP de produtos listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const productsAnpId = req.params["productsAnpId"];
        const row = await productsAnpService.getById(productsAnpId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "ANP de produto recuperado com sucesso.",
            data: row,
        });
    };
}
export const productsAnpController = new ProductsAnpController();
