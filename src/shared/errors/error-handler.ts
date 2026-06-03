import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { logServerError } from "../logging/logger.js";
import { AppError, PayloadTooLargeError } from "./app-error.js";
import { createApiErrorResponse } from "./api-error-response.js";
import { mapZodIssuesToDetails } from "./map-zod-issues.js";

type RequestWithOptionalId = {
  requestId?: string;
};

type ExpressBodyParserError = Error & {
  status?: number;
  type?: string;
};

const INTERNAL_SERVER_ERROR_API_CODE = "INTERNAL_SERVER_ERROR";
const INTERNAL_SERVER_ERROR_MESSAGE = "Erro interno inesperado";
const VALIDATION_ERROR_MESSAGE = "Payload invalido";
const BAD_REQUEST_MESSAGE = "JSON malformado ou corpo da requisicao invalido";

const isBodyParserSyntaxError = (
  error: unknown,
): error is ExpressBodyParserError =>
  error instanceof SyntaxError &&
  (error as ExpressBodyParserError).status === 400 &&
  (error as ExpressBodyParserError).type === "entity.parse.failed";

const isBodyParserPayloadTooLarge = (
  error: unknown,
): error is ExpressBodyParserError =>
  error instanceof Error &&
  (error as ExpressBodyParserError).status === 413 &&
  (error as ExpressBodyParserError).type === "entity.too.large";

export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const request = req as RequestWithOptionalId;
  const requestId = request.requestId ?? null;

  if (isBodyParserSyntaxError(err)) {
    res.status(400).json(
      createApiErrorResponse({
        requestId,
        code: "BAD_REQUEST",
        message: BAD_REQUEST_MESSAGE,
      }),
    );
    return;
  }

  if (isBodyParserPayloadTooLarge(err)) {
    const payloadTooLarge = new PayloadTooLargeError();
    res.status(payloadTooLarge.statusCode).json(
      createApiErrorResponse({
        requestId,
        code: payloadTooLarge.code,
        message: payloadTooLarge.message,
      }),
    );
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json(
      createApiErrorResponse({
        requestId,
        code: "VALIDATION_ERROR",
        message: VALIDATION_ERROR_MESSAGE,
        details: mapZodIssuesToDetails(err.issues),
      }),
    );
    return;
  }

  if (err instanceof AppError) {
    if (err.statusCode >= 500) {
      logServerError({
        requestId,
        apiCode: err.code,
        message: err.message,
        stack: err.stack,
      });
    }

    res.status(err.statusCode).json(
      createApiErrorResponse({
        requestId,
        code: err.code,
        message: err.message,
        details: err.details,
      }),
    );
    return;
  }

  const unexpectedError = err instanceof Error ? err : new Error(String(err));

  logServerError({
    requestId,
    apiCode: INTERNAL_SERVER_ERROR_API_CODE,
    message: unexpectedError.message,
    stack: unexpectedError.stack,
  });

  res.status(500).json(
    createApiErrorResponse({
      requestId,
      code: INTERNAL_SERVER_ERROR_API_CODE,
      message: INTERNAL_SERVER_ERROR_MESSAGE,
    }),
  );
};
