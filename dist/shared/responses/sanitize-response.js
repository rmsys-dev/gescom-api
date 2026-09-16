const SENSITIVE_EXACT_KEYS = new Set([
    "password",
    "confirmPassword",
    "codeHash",
    "refreshTokenHash",
    "tokenHash",
    "passwordHash",
    "secret",
    "apiKey",
    "apiSecret",
]);
const ALLOWED_TOKEN_KEYS = new Set(["accessToken", "refreshToken"]);
const escapeHtml = (value) => value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
const isSensitiveKey = (key) => {
    if (ALLOWED_TOKEN_KEYS.has(key)) {
        return false;
    }
    if (SENSITIVE_EXACT_KEYS.has(key)) {
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
    return false;
};
export const sanitizeApiData = (value) => {
    if (value === null || value === undefined) {
        return value;
    }
    if (Array.isArray(value)) {
        return value.map((item) => sanitizeApiData(item));
    }
    if (typeof value !== "object") {
        if (typeof value === "string") {
            return escapeHtml(value);
        }
        return value;
    }
    if (value instanceof Date) {
        return value;
    }
    const sanitized = {};
    for (const [key, nested] of Object.entries(value)) {
        if (isSensitiveKey(key)) {
            continue;
        }
        sanitized[key] =
            nested !== null && typeof nested === "object"
                ? sanitizeApiData(nested)
                : nested;
    }
    return sanitized;
};
