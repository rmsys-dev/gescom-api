import type { Request, Response } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { env } from "../../config/env.js";
import { TooManyRequestsError } from "../errors/app-error.js";

const buildKey = (req: Request): string => {
  const forwardedFor = req.header("x-forwarded-for");
  const fallbackIp =
    typeof forwardedFor === "string" && forwardedFor.length > 0
      ? forwardedFor.split(",")[0]?.trim() ?? "unknown"
      : req.ip ?? "unknown";

  return ipKeyGenerator(fallbackIp);
};

export const apiRateLimit = rateLimit({
  windowMs: env.API_RATE_LIMIT_WINDOW_MS,
  max: env.API_RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: buildKey,
  handler: (_req: Request, _res: Response, next) => {
    next(new TooManyRequestsError());
  },
});
