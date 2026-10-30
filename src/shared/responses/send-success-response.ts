import type { Response } from "express";
import { HttpStatus } from "../http/http-status.js";
import {
  createApiSuccessResponse,
  type ApiPagination,
  type PaginatedServiceResult,
} from "./api-success-response.js";
import { sanitizeApiData } from "./sanitize-response.js";

type SendSuccessOptions = {
  message: string;
  data?: unknown;
  pagination?: ApiPagination;
  sanitize?: boolean;
};

export const sendSuccessResponse = (
  res: Response,
  statusCode: number,
  { message, data = null, pagination, sanitize = true }: SendSuccessOptions,
): void => {
  const payload = sanitize ? sanitizeApiData(data) : data;

  res
    .status(statusCode)
    .json(createApiSuccessResponse({ message, data: payload, pagination }));
};

export const sendPaginatedSuccessResponse = (
  res: Response,
  statusCode: number,
  {
    message,
    items,
    total,
    limit,
    offset,
  }: PaginatedServiceResult<unknown> & { message: string },
): void => {
  sendSuccessResponse(res, statusCode, {
    message,
    data: items,
    pagination: { total, limit, offset },
  });
};

export const sendListSuccessResponse = (
  res: Response,
  message: string,
  items: unknown[],
  statusCode = HttpStatus.OK,
): void => {
  sendSuccessResponse(res, statusCode, { message, data: items });
};

export const sendPageFromService = (
  res: Response,
  statusCode: number,
  message: string,
  page: PaginatedServiceResult<unknown>,
): void => {
  sendPaginatedSuccessResponse(res, statusCode, { message, ...page });
};
