import type { Request, Response } from "express";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithId } from "../../shared/middleware/request-id.js";
import { sendSuccessResponse } from "../../shared/responses/send-success-response.js";
import type {
  FirstAccessLookupInput,
  FirstAccessResendInput,
  FirstAccessVerifyInput,
} from "./schema.js";
import {
  firstAccessLookup,
  firstAccessResend,
  firstAccessVerify,
} from "./first-access.service.js";

const meta = (req: Request) => ({
  ipAddress: req.ip ?? null,
  userAgent: req.header("user-agent") ?? null,
  requestId: (req as RequestWithId).requestId ?? null,
});

const resolveLookupLogin = (body: FirstAccessLookupInput) => {
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
