import { LogEvents } from "../logging/log-events.js";
import { logInfo } from "../logging/logger.js";
export const requestLogger = (req, res, next) => {
    const startedAt = Date.now();
    res.on("finish", () => {
        const request = req;
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
