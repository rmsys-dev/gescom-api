import type { Request, Response } from "express";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithId } from "../../shared/middleware/request-id.js";
import { sendSuccessResponse } from "../../shared/responses/send-success-response.js";
import type {
  PasswordResetRequestInput,
  PasswordResetResendInput,
  PasswordResetVerifyInput,
} from "./schema.js";
import {
  passwordResetRequest,
  passwordResetResend,
  passwordResetVerify,
} from "./password-reset.service.js";

const meta = (req: Request) => ({
  ipAddress: req.ip ?? null,
  userAgent: req.header("user-agent") ?? null,
  requestId: (req as RequestWithId).requestId ?? null,
});

const resolveLookupLogin = (
  body: PasswordResetRequestInput | PasswordResetResendInput,
) => {
  if (body.email) {
    return {
      loginType: "EMAIL" as const,
      login: body.email,
    };
  }

  return {
    loginType: "CPF/CNPJ" as const,
    login: body.cpf ?? "",
  };
};

const genericMessage =
  "Se existir cadastro elegivel, enviamos instrucoes por e-mail.";

export class PasswordResetController {
  public request = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as PasswordResetRequestInput;
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

  public verify = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as PasswordResetVerifyInput;
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

  public resend = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as PasswordResetResendInput;
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
