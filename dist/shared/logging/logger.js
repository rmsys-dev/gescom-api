import { LogEvents } from "./log-events.js";
import { sanitizeLogData } from "./sanitize-log-data.js";
const writeLog = (level, payload) => {
    const sanitized = sanitizeLogData(payload);
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        ...sanitized,
    };
    const line = JSON.stringify(entry);
    if (level === "error") {
        console.error(line);
        return;
    }
    if (level === "warn") {
        console.warn(line);
        return;
    }
    console.info(line);
};
export const logInfo = (payload) => {
    writeLog("info", payload);
};
export const logWarn = (payload) => {
    writeLog("warn", payload);
};
export const logError = (payload) => {
    writeLog("error", payload);
};
export const logServerError = (input) => {
    logError({
        event: LogEvents.SERVER_ERROR,
        requestId: input.requestId,
        apiCode: input.apiCode,
        message: input.message,
        stack: input.stack,
        ...(input.cause ? { cause: input.cause } : {}),
    });
};
