import { db } from "../../db/schema.js";
import { authAuditLog } from "../../db/schema.js";
import { LogEvents } from "../../shared/logging/log-events.js";
import { logError } from "../../shared/logging/logger.js";
import { toDbLoginType } from "./password.js";
export const writeAudit = async (input) => {
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
    }
    catch (error) {
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
