const LOG_SENSITIVE_EXACT_KEYS = new Set([
    "password",
    "confirmPassword",
    "codeHash",
    "refreshTokenHash",
    "tokenHash",
    "passwordHash",
    "secret",
    "apiKey",
    "apiSecret",
    "accessToken",
    "refreshToken",
    "token",
    "authorization",
    "loginAttempt",
    "userEmail",
    "email",
    "cpf",
    "userRegistration",
    "phone",
    "phoneNumber",
    "ipAddress",
    "userAgent",
    "sessionId",
    "code",
    "otp",
    "verificationCode",
    "payload",
]);
const REDACTED = "[REDACTED]";
const isSensitiveLogKey = (key) => {
    if (LOG_SENSITIVE_EXACT_KEYS.has(key)) {
        return true;
    }
    const lower = key.toLowerCase();
    if (lower.includes("password")) {
        return true;
    }
    if (lower.endsWith("hash")) {
        return true;
    }
    if (lower === "secret" || lower.endsWith("secret")) {
        return true;
    }
    if (lower.includes("token")) {
        return true;
    }
    return false;
};
export const sanitizeLogData = (value) => {
    if (value === null || value === undefined) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeLogData(item));
    }
    if (typeof value !== "object") {
        return value;
    }
    if (value instanceof Date) {
        return value;
    }
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
        };
    }
    const sanitized = {};
    for (const [key, nested] of Object.entries(value)) {
        if (isSensitiveLogKey(key)) {
            sanitized[key] = REDACTED;
            continue;
        }
        sanitized[key] =
            nested !== null && typeof nested === "object"
                ? sanitizeLogData(nested)
                : nested;
    }
    return sanitized;
};
