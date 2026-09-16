import { createHash, randomUUID } from "node:crypto";
import jwt from "jsonwebtoken";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../shared/errors/app-error.js";
import { MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, MS_PER_SECOND, } from "../../shared/time/duration.js";
const ACCESS_SECRET = env.JWT_SECRET;
const REFRESH_SECRET = env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES_IN = env.JWT_ACCESS_EXPIRES_IN;
const REFRESH_EXPIRES_IN = env.JWT_REFRESH_EXPIRES_IN;
const JWT_ISSUER = env.JWT_ISSUER;
const JWT_AUDIENCE = env.JWT_AUDIENCE;
export const signAccessToken = (claims) => jwt.sign(claims, ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: ACCESS_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
});
export const signRefreshToken = (claims) => jwt.sign(claims, REFRESH_SECRET, {
    algorithm: "HS256",
    expiresIn: REFRESH_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
});
export const verifyAccessToken = (token) => {
    try {
        const decoded = jwt.verify(token, ACCESS_SECRET, {
            algorithms: ["HS256"],
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        });
        if (!decoded.sub || !decoded.sid) {
            throw new UnauthorizedError("Token de acesso invalido", "INVALID_ACCESS_TOKEN");
        }
        return {
            sub: decoded.sub,
            sid: decoded.sid,
            ent: decoded.ent ?? decoded.enterpriseId,
            enterpriseId: decoded.enterpriseId ?? decoded.ent,
            mem: decoded.mem,
        };
    }
    catch (error) {
        if (error instanceof UnauthorizedError) {
            throw error;
        }
        throw new UnauthorizedError("Token de acesso invalido ou expirado", "INVALID_ACCESS_TOKEN");
    }
};
export const verifyRefreshToken = (token) => {
    try {
        const decoded = jwt.verify(token, REFRESH_SECRET, {
            algorithms: ["HS256"],
            issuer: JWT_ISSUER,
            audience: JWT_AUDIENCE,
        });
        if (!decoded.sub || !decoded.sid || !decoded.jti) {
            throw new UnauthorizedError("Refresh token invalido", "INVALID_REFRESH_TOKEN");
        }
        return {
            sub: decoded.sub,
            sid: decoded.sid,
            jti: decoded.jti,
            ent: decoded.ent ?? decoded.enterpriseId,
            enterpriseId: decoded.enterpriseId ?? decoded.ent,
        };
    }
    catch (error) {
        if (error instanceof UnauthorizedError) {
            throw error;
        }
        throw new UnauthorizedError("Refresh token invalido ou expirado", "INVALID_REFRESH_TOKEN");
    }
};
export const hashRefreshToken = (token) => createHash("sha256").update(token).digest("hex");
export const newJti = () => randomUUID();
const TIME_UNIT_MAP = {
    s: MS_PER_SECOND,
    m: MS_PER_MINUTE,
    h: MS_PER_HOUR,
    d: MS_PER_DAY,
};
// Converte expressões como "15m", "7d", "3600" (s) em milissegundos.
export const parseDurationToMs = (input) => {
    const trimmed = input.trim();
    const match = /^(\d+)\s*([smhd])?$/i.exec(trimmed);
    if (!match) {
        throw new Error(`Duracao invalida: ${input}`);
    }
    const amount = Number(match[1]);
    const unit = (match[2] ?? "s").toLowerCase();
    return amount * (TIME_UNIT_MAP[unit] ?? 1000);
};
export const refreshTokenExpiresAt = () => {
    const ms = parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN);
    return new Date(Date.now() + ms);
};
