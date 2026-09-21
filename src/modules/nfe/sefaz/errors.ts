import { AppError } from "../../../shared/errors/app-error.js";

export const nfeCertInvalidError = (
  message: string,
  statusCode = 400,
): AppError =>
  new AppError({
    statusCode,
    code: "NFE_CERT_INVALID",
    message,
  });

export const nfeEndpointNotFoundError = (message: string): AppError =>
  new AppError({
    statusCode: 400,
    code: "NFE_ENDPOINT_NOT_FOUND",
    message,
  });

export const sefazTimeoutError = (): AppError =>
  new AppError({
    statusCode: 504,
    code: "SEFAZ_TIMEOUT",
    message: "Tempo esgotado ao consultar a SEFAZ",
  });

export const sefazUnavailableError = (message: string): AppError =>
  new AppError({
    statusCode: 502,
    code: "SEFAZ_UNAVAILABLE",
    message,
  });
