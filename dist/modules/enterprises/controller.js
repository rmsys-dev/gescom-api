import { HttpStatus } from "../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../shared/responses/send-success-response.js";
import { auditContextFromRequest } from "../../shared/audit/request-meta.js";
import { enterprisesService } from "./service.js";
import { enterpriseParametersService } from "./parameters/service.js";
export class EnterprisesController {
    //Listagem de empresas
    list = async (req, res) => {
        const reqAuth = req;
        const query = req
            .validatedQuery;
        const page = await enterprisesService.listForAuthenticatedUser(reqAuth.auth.userId, query);
        sendPageFromService(res, HttpStatus.OK, "Empresas listadas com sucesso.", page);
    };
    //Busca uma empresa por ID
    getById = async (req, res) => {
        const id = req.params["enterpriseId"];
        const row = await enterprisesService.getById(id);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Empresa recuperada com sucesso.",
            data: row,
        });
    };
    //Altera uma empresa
    patch = async (req, res) => {
        const id = req.params["enterpriseId"];
        const body = req.body;
        const row = await enterprisesService.patch(id, body, auditContextFromRequest(req, "enterprises.service.patch", {
            enterpriseId: id,
        }));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Empresa atualizada com sucesso.",
            data: row,
        });
    };
    getParameters = async (req, res) => {
        const id = req.params["enterpriseId"];
        const data = await enterpriseParametersService.getForEnterprise(id);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Parametros da empresa recuperados com sucesso.",
            data,
        });
    };
}
export const enterprisesController = new EnterprisesController();
