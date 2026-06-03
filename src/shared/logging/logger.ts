import { LogEvents } from "./log-events.js";
import { sanitizeLogData } from "./sanitize-log-data.js";

type LogLevel = "info" | "warn" | "error";

export type LogPayload = {
  event: string;
  requestId?: string | null;
} & Record<string, unknown>;

const writeLog = (level: LogLevel, payload: LogPayload): void => {
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

export const logInfo = (payload: LogPayload): void => {
  writeLog("info", payload);
};

export const logWarn = (payload: LogPayload): void => {
  writeLog("warn", payload);
};

export const logError = (payload: LogPayload): void => {
  writeLog("error", payload);
};

export const logServerError = (input: {
  requestId?: string | null;
  apiCode: string;
  message: string;
  stack?: string;
}): void => {
  logError({
    event: LogEvents.SERVER_ERROR,
    requestId: input.requestId,
    apiCode: input.apiCode,
    message: input.message,
    stack: input.stack,
  });
};
