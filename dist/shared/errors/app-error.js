export class AppError extends Error {
    statusCode;
    code;
    details;
    constructor({ statusCode, code, message, details }) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
    }
}
export class UnauthorizedError extends AppError {
    constructor(message = "Credenciais ausentes ou invalidas", code = "UNAUTHORIZED") {
        super({
            statusCode: 401,
            code,
            message,
        });
    }
}
export class ForbiddenError extends AppError {
    constructor(message = "Acesso negado", code = "FORBIDDEN", details) {
        super({
            statusCode: 403,
            code,
            message,
            details,
        });
    }
}
export class LockedError extends AppError {
    constructor(message = "Conta temporariamente bloqueada", code = "ACCOUNT_LOCKED") {
        super({
            statusCode: 423,
            code,
            message,
        });
    }
}
export class TooManyRequestsError extends AppError {
    constructor(message = "Muitas tentativas. Tente novamente mais tarde.", code = "RATE_LIMITED") {
        super({
            statusCode: 429,
            code,
            message,
        });
    }
}
export class BadRequestError extends AppError {
    constructor(message = "Requisicao invalida", code = "BAD_REQUEST", details) {
        super({
            statusCode: 400,
            code,
            message,
            details,
        });
    }
}
export class ValidationError extends AppError {
    constructor(details, message = "Payload invalido") {
        super({
            statusCode: 422,
            code: "VALIDATION_ERROR",
            message,
            details,
        });
    }
}
export class NotFoundError extends AppError {
    constructor(message = "Recurso nao encontrado", code = "RESOURCE_NOT_FOUND") {
        super({
            statusCode: 404,
            code,
            message,
        });
    }
}
export class ConflictError extends AppError {
    constructor(message = "Conflito de dados", code = "CONFLICT") {
        super({
            statusCode: 409,
            code,
            message,
        });
    }
}
export class PayloadTooLargeError extends AppError {
    constructor(message = "Payload excede o limite permitido", code = "PAYLOAD_TOO_LARGE") {
        super({
            statusCode: 413,
            code,
            message,
        });
    }
}
export class InternalServerError extends AppError {
    constructor(message = "Erro interno inesperado", code = "INTERNAL_SERVER_ERROR", details) {
        super({
            statusCode: 500,
            code,
            message,
            details,
        });
    }
}
