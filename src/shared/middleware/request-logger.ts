import type { NextFunction, Request, Response } from "express";
import { LogEvents } from "../logging/log-events.js";
import { logInfo } from "../logging/logger.js";
import type { RequestWithId } from "./request-id.js";

export const requestLogger = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  const startedAt = Date.now();

  res.on("finish", () => {
    const request = req as RequestWithId;

    logInfo({
      event: LogEvents.HTTP_REQUEST,
      requestId: request.requestId,
      method: req.method,
      path: req.originalUrl.split("?")[0],
      statusCode: res.statusCode,
      durationMs: Date.now() - startedAt,
    });
  });

  next();
};
