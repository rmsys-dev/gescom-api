import { db } from "../../db/schema.js";
import { authAuditLog } from "../../db/schema.js";
import { LogEvents } from "../../shared/logging/log-events.js";
import { logError } from "../../shared/logging/logger.js";
import { type AuthLoginType, toDbLoginType } from "./password.js";

export type { AuthLoginType } from "./password.js";

export type AuthEvent =
  | "LOGIN_SUCCESS"
  | "LOGIN_FAILED_PASSWORD"
  | "LOGIN_FAILED_USER"
  | "LOGIN_BLOCKED"
  | "LOGOUT"
  | "REFRESH"
  | "REFRESH_REUSE"
  | "SWITCH_ENTERPRISE"
  | "RATE_LIMITED"
  | "PERMISSION_DENIED"
  | "SIGNUP"
  | "SIGNUP_FAILED"
  | "FIRST_ACCESS_REQUESTED"
  | "FIRST_ACCESS_VERIFIED"
  | "FIRST_ACCESS_FAILED"
  | "INVITE_CREATED"
  | "INVITE_ACCEPTED"
  | "INVITE_DECLINED"
  | "INVITE_EXPIRED"
  | "CODE_RATE_LIMITED"
  | "PASSWORD_RESET_REQUESTED"
  | "PASSWORD_RESET_VERIFIED"
  | "PASSWORD_RESET_FAILED"
  | "PASSWORD_RESET_RATE_LIMITED";

export type AuditInput = {
  event: AuthEvent;
  userId?: string | null;
  loginAttempt?: string | null;
  loginType?: AuthLoginType | null;
  enterpriseId?: string | null;
  sessionId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  reason?: string | null;
};

export const writeAudit = async (input: AuditInput): Promise<void> => {
  try {
    await db.insert(authAuditLog).values({
      event: input.event,
      userId: input.userId ?? null,
      loginAttempt: input.loginAttempt ?? null,
      loginType: input.loginType ? toDbLoginType(input.loginType) : null,
      enterpriseId: input.enterpriseId ?? null,
      sessionId: input.sessionId ?? null,
      ipAddress: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      requestId: input.requestId ?? null,
      reason: input.reason ?? null,
    });
  } catch (error) {
    logError({
      event: LogEvents.AUTH_AUDIT_WRITE_FAILED,
      requestId: input.requestId,
      auditEvent: input.event,
      userId: input.userId,
      enterpriseId: input.enterpriseId,
      reason: error instanceof Error ? error.message : "unknown",
    });
  }
};
