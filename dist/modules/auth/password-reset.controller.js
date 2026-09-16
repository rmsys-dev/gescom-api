import { HttpStatus } from "../../shared/http/http-status.js";
import { sendSuccessResponse } from "../../shared/responses/send-success-response.js";
import { passwordResetRequest, passwordResetResend, passwordResetVerify, } from "./password-reset.service.js";
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
const genericMessage = "Se existir cadastro elegivel, enviamos instrucoes por e-mail.";
export class PasswordResetController {
    request = async (req, res) => {
        const body = req.body;
        const loginInput = resolveLookupLogin(body);
        await passwordResetRequest({
            loginType: loginInput.loginType,
            login: loginInput.login,
            ...meta(req),
        });
        sendSuccessResponse(res, HttpStatus.OK, {
            message: genericMessage,
            data: null,
        });
    };
    verify = async (req, res) => {
        const body = req.body;
        await passwordResetVerify({
            loginType: body.loginType,
            login: body.login,
            code: body.code,
            password: body.password,
            confirmPassword: body.confirmPassword,
            ...meta(req),
        });
        sendSuccessResponse(res, HttpStatus.OK, {
            message: "Senha redefinida com sucesso.",
            data: null,
        });
    };
    resend = async (req, res) => {
        const body = req.body;
        const loginInput = resolveLookupLogin(body);
        await passwordResetResend({
            loginType: loginInput.loginType,
            login: loginInput.login,
            ...meta(req),
        });
        sendSuccessResponse(res, HttpStatus.OK, {
            message: genericMessage,
            data: null,
        });
    };
}
