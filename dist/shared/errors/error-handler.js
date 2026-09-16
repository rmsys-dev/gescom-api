import { ZodError } from "zod";
import { logServerError } from "../logging/logger.js";
import { AppError, PayloadTooLargeError } from "./app-error.js";
import { createApiErrorResponse } from "./api-error-response.js";
import { extractLoggableErrorCause } from "./extract-error-cause.js";
import { mapZodIssuesToDetails } from "./map-zod-issues.js";
const INTERNAL_SERVER_ERROR_API_CODE = "INTERNAL_SERVER_ERROR";
const INTERNAL_SERVER_ERROR_MESSAGE = "Erro interno inesperado";
const VALIDATION_ERROR_MESSAGE = "Payload invalido";
const BAD_REQUEST_MESSAGE = "JSON malformado ou corpo da requisicao invalido";
const isBodyParserSyntaxError = (error) => error instanceof SyntaxError &&
    error.status === 400 &&
    error.type === "entity.parse.failed";
const isBodyParserPayloadTooLarge = (error) => error instanceof Error &&
    error.status === 413 &&
    error.type === "entity.too.large";
export const errorHandler = (err, req, res, _next) => {
    const request = req;
    const requestId = request.requestId ?? null;
    if (isBodyParserSyntaxError(err)) {
        res.status(400).json(createApiErrorResponse({
            requestId,
            code: "BAD_REQUEST",
            message: BAD_REQUEST_MESSAGE,
        }));
        return;
    }
    if (isBodyParserPayloadTooLarge(err)) {
        const payloadTooLarge = new PayloadTooLargeError();
        res.status(payloadTooLarge.statusCode).json(createApiErrorResponse({
            requestId,
            code: payloadTooLarge.code,
            message: payloadTooLarge.message,
        }));
        return;
    }
    if (err instanceof ZodError) {
        res.status(422).json(createApiErrorResponse({
            requestId,
            code: "VALIDATION_ERROR",
            message: VALIDATION_ERROR_MESSAGE,
            details: mapZodIssuesToDetails(err.issues),
        }));
        return;
    }
    if (err instanceof AppError) {
        if (err.statusCode >= 500) {
            logServerError({
                requestId,
                apiCode: err.code,
                message: err.message,
                stack: err.stack,
                cause: extractLoggableErrorCause(err),
            });
        }
        res.status(err.statusCode).json(createApiErrorResponse({
            requestId,
            code: err.code,
            message: err.message,
            details: err.details,
        }));
        return;
    }
    const unexpectedError = err instanceof Error ? err : new Error(String(err));
    logServerError({
        requestId,
        apiCode: INTERNAL_SERVER_ERROR_API_CODE,
        message: unexpectedError.message,
        stack: unexpectedError.stack,
        cause: extractLoggableErrorCause(unexpectedError),
    });
    res.status(500).json(createApiErrorResponse({
        requestId,
        code: INTERNAL_SERVER_ERROR_API_CODE,
        message: INTERNAL_SERVER_ERROR_MESSAGE,
    }));
};
