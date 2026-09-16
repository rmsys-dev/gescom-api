import rateLimitLib, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../../config/env.js";
import { TooManyRequestsError } from "../errors/app-error.js";
import { writeAudit } from "../../modules/auth/audit.js";
import { normalizeCpfCnpj, normalizeEmail } from "../validation/data-normalizers.js";
import { normalizeLogin } from "../../modules/auth/password.js";
const normalizeLoginKey = (rawLogin, loginType) => {
    if (loginType) {
        return normalizeLogin(loginType, rawLogin);
    }
    return rawLogin.includes("@")
        ? normalizeEmail(rawLogin)
        : normalizeCpfCnpj(rawLogin);
};
const buildKey = (req) => {
    const ipKey = ipKeyGenerator(req.ip ?? "unknown");
    const body = (req.body ?? {});
    const rawLogin = typeof body.login === "string" ? body.login : "";
    const loginType = body.loginType === "EMAIL" || body.loginType === "CPF/CNPJ"
        ? body.loginType
        : null;
    const loginKey = rawLogin.length > 0 ? normalizeLoginKey(rawLogin, loginType) : "";
    return loginKey.length > 0 ? `${ipKey}:${loginKey}` : ipKey;
};
//Esse arquivo é responsável por limitar o número de tentativas de primeiro acesso
//Ela recebe uma requisição e limita o número de tentativas de primeiro acesso
//Se o número de tentativas de primeiro acesso for maior que o limite, ela lança um erro
//Se o número de tentativas de primeiro acesso for menor que o limite, ela escreve a auditoria e retorna um erro
export const firstAccessRateLimit = rateLimitLib({
    windowMs: env.FIRST_ACCESS_RATE_LIMIT_WINDOW_MS,
    max: env.FIRST_ACCESS_RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: buildKey,
    handler: async (req, _res, next) => {
        const reqWithId = req;
        const body = (req.body ?? {});
        const loginAttempt = typeof body.login === "string" ? body.login : null;
        const loginType = body.loginType === "EMAIL" || body.loginType === "CPF/CNPJ"
            ? body.loginType
            : null;
        await writeAudit({
            event: "CODE_RATE_LIMITED",
            loginAttempt,
            loginType,
            ipAddress: req.ip ?? null,
            userAgent: req.header("user-agent") ?? null,
            requestId: reqWithId.requestId ?? null,
            reason: `Rate limit primeiro acesso em ${req.path}`,
        });
        next(new TooManyRequestsError());
    },
});
