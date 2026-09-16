import { HttpStatus } from "../http/http-status.js";
import { createApiSuccessResponse, } from "./api-success-response.js";
import { sanitizeApiData } from "./sanitize-response.js";
export const sendSuccessResponse = (res, statusCode, { message, data = null, pagination, sanitize = true }) => {
    const payload = sanitize ? sanitizeApiData(data) : data;
    res
        .status(statusCode)
        .json(createApiSuccessResponse({ message, data: payload, pagination }));
};
export const sendPaginatedSuccessResponse = (res, statusCode, { message, items, total, limit, offset, }) => {
    sendSuccessResponse(res, statusCode, {
        message,
        data: items,
        pagination: { total, limit, offset },
    });
};
export const sendListSuccessResponse = (res, message, items, statusCode = HttpStatus.OK) => {
    sendSuccessResponse(res, statusCode, { message, data: items });
};
export const sendPageFromService = (res, statusCode, message, page) => {
    sendPaginatedSuccessResponse(res, statusCode, { message, ...page });
};
