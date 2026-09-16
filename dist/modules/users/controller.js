import { requireTenantEnterpriseId } from "../../shared/controllers/tenant-context.js";
import { HttpStatus } from "../../shared/http/http-status.js";
import { sendPageFromService, sendSuccessResponse, } from "../../shared/responses/send-success-response.js";
import { auditContextFromAuth, auditContextFromPostAuth, auditMetaFromRequest, } from "../../shared/audit/request-meta.js";
import { usersService } from "./service.js";
export class UsersController {
    //Cria um usuário
    create = async (req, res) => {
        const reqAuth = req;
        const body = req.body;
        const enterpriseId = requireTenantEnterpriseId(reqAuth.auth);
        const row = await usersService.createUser(body, enterpriseId, auditContextFromPostAuth(reqAuth.auth, req, "users.service.createUser", { enterpriseId }));
        sendSuccessResponse(res, HttpStatus.CREATED, {
            message: "Usuário criado com sucesso.",
            data: row,
        });
    };
    //Lista usuários (cadastro global; acesso controlado por permissão)
    list = async (req, res) => {
        const query = req
            .validatedQuery;
        const page = await usersService.findMany(query);
        sendPageFromService(res, HttpStatus.OK, "Usuários listados com sucesso.", page);
    };
    //Busca um usuário pelo ID
    getById = async (req, res) => {
        const reqWithRead = req;
        const { targetUserId, readMode } = reqWithRead.userReadAccess;
        const enterpriseId = reqWithRead.auth.enterpriseId ?? "";
        const row = await usersService.getByIdForRequester(targetUserId, readMode, enterpriseId);
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Usuário recuperado com sucesso.",
            data: row,
        });
    };
    //Altera parcialmente um usuário
    patch = async (req, res) => {
        const reqAuth = req;
        const userId = req.params["userId"];
        const body = req.body;
        const enterpriseId = requireTenantEnterpriseId(reqAuth.auth);
        const row = await usersService.patchUser(userId, body, enterpriseId, auditContextFromAuth(reqAuth.auth, auditMetaFromRequest(req), "users.service.patchUser", { enterpriseId }));
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Usuário atualizado com sucesso.",
            data: row,
        });
    };
}
export const usersController = new UsersController();
