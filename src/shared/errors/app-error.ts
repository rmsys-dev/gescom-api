import type { ApiErrorDetails } from "./api-error-response.js";

type AppErrorInput = {
  statusCode: number;
  code: string;
  message: string;
  details?: ApiErrorDetails;
};

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: ApiErrorDetails;

  public constructor({ statusCode, code, message, details }: AppErrorInput) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export class UnauthorizedError extends AppError {
  public constructor(
    message = "Credenciais ausentes ou invalidas",
    code = "UNAUTHORIZED",
  ) {
    super({
      statusCode: 401,
      code,
      message,
    });
  }
}

export class ForbiddenError extends AppError {
  public constructor(message = "Acesso negado", code = "FORBIDDEN") {
    super({
      statusCode: 403,
      code,
      message,
    });
  }
}

export class LockedError extends AppError {
  public constructor(
    message = "Conta temporariamente bloqueada",
    code = "ACCOUNT_LOCKED",
  ) {
    super({
      statusCode: 423,
      code,
      message,
    });
  }
}

export class TooManyRequestsError extends AppError {
  public constructor(
    message = "Muitas tentativas. Tente novamente mais tarde.",
    code = "RATE_LIMITED",
  ) {
    super({
      statusCode: 429,
      code,
      message,
    });
  }
}

export class BadRequestError extends AppError {
  public constructor(
    message = "Requisicao invalida",
    code = "BAD_REQUEST",
    details?: ApiErrorDetails,
  ) {
    super({
      statusCode: 400,
      code,
      message,
      details,
    });
  }
}

export class ValidationError extends AppError {
  public constructor(details: ApiErrorDetails, message = "Payload invalido") {
    super({
      statusCode: 422,
      code: "VALIDATION_ERROR",
      message,
      details,
    });
  }
}

export class NotFoundError extends AppError {
  public constructor(
    message = "Recurso nao encontrado",
    code = "RESOURCE_NOT_FOUND",
  ) {
    super({
      statusCode: 404,
      code,
      message,
    });
  }
}

export class ConflictError extends AppError {
  public constructor(message = "Conflito de dados", code = "CONFLICT") {
    super({
      statusCode: 409,
      code,
      message,
    });
  }
}

export class PayloadTooLargeError extends AppError {
  public constructor(
    message = "Payload excede o limite permitido",
    code = "PAYLOAD_TOO_LARGE",
  ) {
    super({
      statusCode: 413,
      code,
      message,
    });
  }
}

export class InternalServerError extends AppError {
  public constructor(
    message = "Erro interno inesperado",
    code = "INTERNAL_SERVER_ERROR",
    details?: ApiErrorDetails,
  ) {
    super({
      statusCode: 500,
      code,
      message,
      details,
    });
  }
}
