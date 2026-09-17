import type { Request, Response } from "express";
import rateLimitLib, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../../config/env.js";
import { writeAudit } from "../../modules/auth/audit.js";
import { TooManyRequestsError } from "../errors/app-error.js";
import type { RequestWithId } from "./request-id.js";

import { normalizeCpfCnpj, normalizeEmail } from "../validation/data-normalizers.js";

const normalizeKeyPart = (value: string): string =>
  value.includes("@")
    ? normalizeEmail(value)
    : normalizeCpfCnpj(value);

const buildKey = (req: Request): string => {
  const ipKey = ipKeyGenerator(req.ip ?? "unknown");
  const body = (req.body ?? {}) as {
    login?: unknown;
    email?: unknown;
    cpf?: unknown;
  };

  const rawLogin =
    typeof body.login === "string"
      ? body.login
      : typeof body.email === "string"
        ? body.email
        : typeof body.cpf === "string"
          ? body.cpf
          : "";

  const loginKey = normalizeKeyPart(rawLogin);
  return loginKey.length > 0 ? `${ipKey}:${loginKey}` : ipKey;
};

export const passwordResetRateLimit = rateLimitLib({
  windowMs: env.PASSWORD_RESET_RATE_LIMIT_WINDOW_MS,
  max: env.PASSWORD_RESET_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: buildKey,
  handler: async (req: Request, _res: Response, next) => {
    const reqWithId = req as RequestWithId;
    const body = (req.body ?? {}) as {
      login?: unknown;
      email?: unknown;
      cpf?: unknown;
      loginType?: unknown;
    };

    const loginAttempt =
      typeof body.login === "string"
        ? body.login
        : typeof body.email === "string"
          ? body.email
          : typeof body.cpf === "string"
            ? body.cpf
            : null;
    const loginType =
      body.loginType === "EMAIL" || body.loginType === "CPF/CNPJ"
        ? body.loginType
        : typeof body.email === "string"
          ? "EMAIL"
          : typeof body.cpf === "string"
            ? "CPF/CNPJ"
            : null;

    await writeAudit({
      event: "PASSWORD_RESET_RATE_LIMITED",
      loginAttempt,
      loginType,
      ipAddress: req.ip ?? null,
      userAgent: req.header("user-agent") ?? null,
      requestId: reqWithId.requestId ?? null,
      reason: `Rate limit redefinicao de senha em ${req.path}`,
    });

    next(new TooManyRequestsError());
  },
});
