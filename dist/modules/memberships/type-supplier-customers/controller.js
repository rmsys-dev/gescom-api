import { auditContextFromDeleteAuth, auditContextFromPatchAuth, auditContextFromPostAuth, } from "../../../shared/audit/request-meta.js";
import { HttpStatus } from "../../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../../shared/responses/send-success-response.js";
import { typeSupplierCustomersService } from "./service.js";
export class TypeSupplierCustomersController {
    list = async (req, res) => {
        const query = req.validatedQuery;
        const page = await typeSupplierCustomersService.list(query);
        sendPageFromService(res, HttpStatus.OK, "Tipos de fornecedor/cliente listados com sucesso.", page);
    };
    getById = async (req, res) => {
        const typeSupplierCustomerId = req.params["typeSupplierCustomerId"];
        const row = await typeSupplierCustomersService.getById(typeSupplierCustomerId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tipo de fornecedor/cliente recuperado com sucesso.",
            data: row,
        });
    };
    create = async (req, res) => {
        const body = req.body;
        const auth = req.auth;
        const row = await typeSupplierCustomersService.create(body, auditContextFromPostAuth(auth, req, "memberships.type-supplier-customers.service.create"));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Tipo de fornecedor/cliente criado com sucesso.",
            data: row,
        });
    };
    patch = async (req, res) => {
        const typeSupplierCustomerId = req.params["typeSupplierCustomerId"];
        const body = req.body;
        const auth = req.auth;
        const row = await typeSupplierCustomersService.patch(typeSupplierCustomerId, body, auditContextFromPatchAuth(auth, req, "memberships.type-supplier-customers.service.patch"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tipo de fornecedor/cliente atualizado com sucesso.",
            data: row,
        });
    };
    delete = async (req, res) => {
        const typeSupplierCustomerId = req.params["typeSupplierCustomerId"];
        const auth = req.auth;
        const row = await typeSupplierCustomersService.delete(typeSupplierCustomerId, auditContextFromDeleteAuth(auth, req, "memberships.type-supplier-customers.service.delete"));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Tipo de fornecedor/cliente excluido com sucesso.",
            data: row,
        });
    };
}
export const typeSupplierCustomersController = new TypeSupplierCustomersController();
