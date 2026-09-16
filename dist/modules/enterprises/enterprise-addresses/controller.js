import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { auditContextFromRequest } from "../../../shared/audit/request-meta.js";
import { enterpriseAddressesService } from "./service.js";
export class EnterpriseAddressesController {
    list = async (req, res) => {
        const enterpriseId = req.params["enterpriseId"];
        const query = req.validatedQuery;
        const page = await enterpriseAddressesService.list(enterpriseId, query);
        sendPageFromService(res, HttpStatus.OK, "Endereços da empresa listados com sucesso.", page);
    };
    create = async (req, res) => {
        const enterpriseId = req.params["enterpriseId"];
        const body = req.body;
        const row = await enterpriseAddressesService.create(enterpriseId, body);
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Endereço da empresa criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const enterpriseId = req.params["enterpriseId"];
        const addressId = req.params["addressId"];
        const body = req.body;
        const row = await enterpriseAddressesService.patch(enterpriseId, addressId, body, auditContextFromRequest(req, "enterprises.enterprise-addresses.service.patch", { enterpriseId }));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Endereço da empresa atualizado com sucesso.",
            data: row,
        });
    };
}
export const enterpriseAddressesController = new EnterpriseAddressesController();
