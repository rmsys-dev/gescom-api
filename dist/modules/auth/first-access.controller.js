import { HttpStatus } from "../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../shared/responses/send-success-response.js";
import { firstAccessLookup, firstAccessResend, firstAccessVerify, } from "./first-access.service.js";
const meta = (req) => ({
    ipAddress: req.ip ?? null,
    userAgent: req.header("user-agent") ?? null,
    requestId: req.requestId ?? null,
});
const resolveLookupLogin = (body) => {
    if (body.email) {
        return {
            loginType: "EMAIL",
            login: body.email,
        };
    }
    return {
        loginType: "CPF/CNPJ",
        login: body.cpf ?? "",
    };
};
const lookupMessage = "Se existir cadastro elegível, enviamos instruções por e-mail.";
export class FirstAccessController {
    lookup = async (req, res) => {
        const body = req.body;
        const loginInput = resolveLookupLogin(body);
        await firstAccessLookup({
            loginType: loginInput.loginType,
            login: loginInput.login,
            ...meta(req),
        });
        sendSuccessResponse(res, HttpStatus.OK, {
            message: lookupMessage,
            data: null,
        });
    };
    verify = async (req, res) => {
        const body = req.body;
        const response = await firstAccessVerify({
            loginType: body.loginType,
            login: body.login,
            code: body.code,
            password: body.password,
            confirmPassword: body.confirmPassword,
            ...meta(req),
        });
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Primeiro acesso concluído com sucesso.",
            data: response,
        });
    };
    resend = async (req, res) => {
        const body = req.body;
        const loginInput = resolveLookupLogin(body);
        await firstAccessResend({
            loginType: loginInput.loginType,
            login: loginInput.login,
            ...meta(req),
        });
        sendSuccessResponse(res, HttpStatus.OK, {
            message: lookupMessage,
            data: null,
        });
    };
}
