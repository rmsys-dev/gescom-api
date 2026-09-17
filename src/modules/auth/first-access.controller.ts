import type { Request, Response } from "express";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithId } from "../../shared/middleware/request-id.js";
import { sendSuccessResponse } from "../../shared/responses/send-success-response.js";
import type {
  FirstAccessConfirmInput,
  FirstAccessLookupInput,
  FirstAccessResendInput,
  FirstAccessVerifyInput,
} from "./schema.js";
import {
  firstAccessConfirm,
  firstAccessLookup,
  firstAccessResend,
  firstAccessVerify,
} from "./first-access.service.js";

const meta = (req: Request) => ({
  ipAddress: req.ip ?? null,
  userAgent: req.header("user-agent") ?? null,
  requestId: (req as RequestWithId).requestId ?? null,
});

const resolveLookupLogin = (
  body:
    | FirstAccessLookupInput
    | FirstAccessResendInput
    | FirstAccessVerifyInput
    | FirstAccessConfirmInput,
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

const lookupMessage =
  "Se existir cadastro elegível, enviamos instruções por e-mail.";

export class FirstAccessController {
  public lookup = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as FirstAccessLookupInput;
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

  public verify = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as FirstAccessVerifyInput;
    const loginInput = resolveLookupLogin(body);
    const result = await firstAccessVerify({
      loginType: loginInput.loginType,
      login: loginInput.login,
      code: body.code,
      ...meta(req),
    });
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Codigo verificado com sucesso.",
      data: { resetToken: result.resetToken },
    });
  };

  public confirm = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as FirstAccessConfirmInput;
    const loginInput = resolveLookupLogin(body);
    const response = await firstAccessConfirm({
      loginType: loginInput.loginType,
      login: loginInput.login,
      resetToken: body.resetToken,
      password: body.password,
      confirmPassword: body.confirmPassword,
      ...meta(req),
    });
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Primeiro acesso concluído com sucesso.",
      data: response,
    });
  };

  public resend = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as FirstAccessResendInput;
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
