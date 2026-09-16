import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { paymentTypesService } from "./service.js";
export class PaymentTypesController {
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await paymentTypesService.list(query);
        sendPageFromService(res, HttpStatus.OK, "Tipos de pagamento listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const paymentTypeId = req.params["paymentTypeId"];
        const row = await paymentTypesService.getById(paymentTypeId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tipo de pagamento recuperado com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const row = await paymentTypesService.create(body, auditContextFromPostAuth(auth, req, "sales.payment-types.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Tipo de pagamento criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const paymentTypeId = req.params["paymentTypeId"];
        const body = req.body;
        const auth = req.auth;
        const row = await paymentTypesService.patch(paymentTypeId, body, auditContextFromPatchAuth(auth, req, "sales.payment-types.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tipo de pagamento atualizado com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const paymentTypeId = req.params["paymentTypeId"];
        const auth = req.auth;
        const row = await paymentTypesService.delete(paymentTypeId, auditContextFromDeleteAuth(auth, req, "sales.payment-types.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tipo de pagamento excluido com sucesso.",
            data: row,
        });
    };
}
export const paymentTypesController = new PaymentTypesController();
