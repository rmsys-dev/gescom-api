export const LogEvents = {
  SERVER_ERROR: "server_error",
  AUTH_AUDIT_WRITE_FAILED: "auth_audit_write_failed",
  ENTITY_AUDIT_WRITE_FAILED: "entity_audit_write_failed",
  HTTP_REQUEST: "http_request",
  SERVER_STARTED: "server_started",
  SHUTDOWN_SIGNAL_RECEIVED: "shutdown_signal_received",
  HTTP_SERVER_CLOSE_ERROR: "http_server_close_error",
} as const;

export type LogEvent = (typeof LogEvents)[keyof typeof LogEvents];
