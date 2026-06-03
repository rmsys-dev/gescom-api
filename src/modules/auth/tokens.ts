import { createHash, randomUUID } from "node:crypto";
import jwt, {
  type JwtPayload,
  type Secret,
  type SignOptions,
} from "jsonwebtoken";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../shared/errors/app-error.js";
import {
  MS_PER_DAY,
  MS_PER_HOUR,
  MS_PER_MINUTE,
  MS_PER_SECOND,
} from "../../shared/time/duration.js";
import type { AccessTokenClaims, RefreshTokenClaims } from "./types.js";

const ACCESS_SECRET: Secret = env.JWT_SECRET;
const REFRESH_SECRET: Secret = env.JWT_REFRESH_SECRET;
const ACCESS_EXPIRES_IN = env.JWT_ACCESS_EXPIRES_IN as SignOptions["expiresIn"];
const REFRESH_EXPIRES_IN =
  env.JWT_REFRESH_EXPIRES_IN as SignOptions["expiresIn"];
const JWT_ISSUER = env.JWT_ISSUER;
const JWT_AUDIENCE = env.JWT_AUDIENCE;

export const signAccessToken = (claims: AccessTokenClaims): string =>
  jwt.sign(claims, ACCESS_SECRET, {
    algorithm: "HS256",
    expiresIn: ACCESS_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

export const signRefreshToken = (claims: RefreshTokenClaims): string =>
  jwt.sign(claims, REFRESH_SECRET, {
    algorithm: "HS256",
    expiresIn: REFRESH_EXPIRES_IN,
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });

export const verifyAccessToken = (token: string): AccessTokenClaims => {
  try {
    const decoded = jwt.verify(token, ACCESS_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtPayload & AccessTokenClaims;
    if (!decoded.sub || !decoded.sid) {
      throw new UnauthorizedError(
        "Token de acesso invalido",
        "INVALID_ACCESS_TOKEN",
      );
    }
    return {
      sub: decoded.sub,
      sid: decoded.sid,
      ent: decoded.ent ?? decoded.enterpriseId,
      enterpriseId: decoded.enterpriseId ?? decoded.ent,
      mem: decoded.mem,
      mdep: decoded.mdep,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError(
      "Token de acesso invalido ou expirado",
      "INVALID_ACCESS_TOKEN",
    );
  }
};

export const verifyRefreshToken = (token: string): RefreshTokenClaims => {
  try {
    const decoded = jwt.verify(token, REFRESH_SECRET, {
      algorithms: ["HS256"],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }) as JwtPayload & RefreshTokenClaims;
    if (!decoded.sub || !decoded.sid || !decoded.jti) {
      throw new UnauthorizedError(
        "Refresh token invalido",
        "INVALID_REFRESH_TOKEN",
      );
    }
    return {
      sub: decoded.sub,
      sid: decoded.sid,
      jti: decoded.jti,
      ent: decoded.ent ?? decoded.enterpriseId,
      enterpriseId: decoded.enterpriseId ?? decoded.ent,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      throw error;
    }
    throw new UnauthorizedError(
      "Refresh token invalido ou expirado",
      "INVALID_REFRESH_TOKEN",
    );
  }
};

export const hashRefreshToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");

export const newJti = (): string => randomUUID();

const TIME_UNIT_MAP: Record<string, number> = {
  s: MS_PER_SECOND,
  m: MS_PER_MINUTE,
  h: MS_PER_HOUR,
  d: MS_PER_DAY,
};

// Converte expressões como "15m", "7d", "3600" (s) em milissegundos.
export const parseDurationToMs = (input: string): number => {
  const trimmed = input.trim();
  const match = /^(\d+)\s*([smhd])?$/i.exec(trimmed);
  if (!match) {
    throw new Error(`Duracao invalida: ${input}`);
  }
  const amount = Number(match[1]);
  const unit = (match[2] ?? "s").toLowerCase();
  return amount * (TIME_UNIT_MAP[unit] ?? 1000);
};

export const refreshTokenExpiresAt = (): Date => {
  const ms = parseDurationToMs(env.JWT_REFRESH_EXPIRES_IN);
  return new Date(Date.now() + ms);
};
