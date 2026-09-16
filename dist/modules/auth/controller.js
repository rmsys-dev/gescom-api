import { HttpStatus } from "../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../shared/responses/send-success-response.js";
const meta = (req) => ({
    ipAddress: req.ip ?? null,
    userAgent: req.header("user-agent") ?? null,
    requestId: req.requestId ?? null,
});
export class AuthController {
    service;
    constructor(service) {
        this.service = service;
    }
    login = async (req, res) => {
        const body = req.body;
        const response = await this.service.login({
            loginType: body.loginType,
            login: body.login,
            password: body.password,
            ...meta(req),
        });
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Login realizado com sucesso.",
            data: response,
        });
    };
    refresh = async (req, res) => {
        const body = req.body;
        const response = await this.service.refresh({
            refreshToken: body.refreshToken,
            ...meta(req),
        });
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Sessão renovada com sucesso.",
            data: response,
        });
    };
    logout = async (req, res) => {
        const reqAuth = req;
        await this.service.logout({
            sessionId: reqAuth.auth.sessionId,
            userId: reqAuth.auth.userId,
            ...meta(req),
        });
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Logout realizado com sucesso.",
            data: null,
        });
    };
    switchEnterprise = async (req, res) => {
        const reqAuth = req;
        const body = req.body;
        const response = await this.service.switchEnterprise({
            userId: reqAuth.auth.userId,
            sessionId: reqAuth.auth.sessionId,
            enterpriseId: body.enterpriseId,
            ...meta(req),
        });
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Empresa da sessão alterada com sucesso.",
            data: response,
        });
    };
    me = async (req, res) => {
        const reqAuth = req;
        const response = await this.service.me({
            userId: reqAuth.auth.userId,
            enterpriseId: reqAuth.auth.enterpriseId,
        });
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Perfil da sessão recuperado com sucesso.",
            data: response,
        });
    };
}
