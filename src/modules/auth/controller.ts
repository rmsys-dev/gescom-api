import type { Request, Response } from "express";
import { HttpStatus } from "../../shared/http/http-status.js";
import type { RequestWithAuth } from "../../shared/middleware/auth-middleware.js";
import type { RequestWithId } from "../../shared/middleware/request-id.js";
import { sendSuccessResponse } from "../../shared/responses/send-success-response.js";
import type { LoginInput, RefreshInput, SwitchEnterpriseInput } from "./schema.js";
import { AuthService } from "./service.js";

const meta = (req: Request) => ({
  ipAddress: req.ip ?? null,
  userAgent: req.header("user-agent") ?? null,
  requestId: (req as RequestWithId).requestId ?? null,
});

export class AuthController {
  public constructor(private readonly service: AuthService) {}

  public login = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as LoginInput;
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

  public refresh = async (req: Request, res: Response): Promise<void> => {
    const body = req.body as RefreshInput;
    const response = await this.service.refresh({
      refreshToken: body.refreshToken,
      ...meta(req),
    });
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Sessão renovada com sucesso.",
      data: response,
    });
  };

  public logout = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
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

  public switchEnterprise = async (
    req: Request,
    res: Response,
  ): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const body = req.body as SwitchEnterpriseInput;
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

  public me = async (req: Request, res: Response): Promise<void> => {
    const reqAuth = req as RequestWithAuth;
    const response = await this.service.me({
      userId: reqAuth.auth.userId,
      enterpriseId: reqAuth.auth.enterpriseId,
      memberDepartmentId: reqAuth.auth.memberDepartmentId,
    });
    sendSuccessResponse(res, HttpStatus.OK, {
      message: "Perfil da sessão recuperado com sucesso.",
      data: response,
    });
  };
}
