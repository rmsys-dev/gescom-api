const SENSITIVE_KEYS = new Set([
    "password",
    "passwordHash",
    "password_hash",
    "token",
    "refreshToken",
    "accessToken",
    "secret",
    "code",
    "codeHash",
]);
const serializeAuditValue = (value) => {
    if (value instanceof Date) {
        return value.toISOString();
    }
    if (value === undefined) {
        return null;
    }
    return value;
};
const valuesEqual = (a, b) => {
    const sa = serializeAuditValue(a);
    const sb = serializeAuditValue(b);
    if (sa === sb) {
        return true;
    }
    if (typeof sa === "object" &&
        sa !== null &&
        typeof sb === "object" &&
        sb !== null) {
        return JSON.stringify(sa) === JSON.stringify(sb);
    }
    return false;
};
/** Monta diff campo a campo entre dois snapshots (ignora campos sensíveis). */
export const buildFieldDiff = (before, after, keys) => {
    const fields = {};
    const keysToCheck = keys ??
        [...new Set([...Object.keys(before), ...Object.keys(after)])].filter((k) => !SENSITIVE_KEYS.has(k));
    for (const key of keysToCheck) {
        if (SENSITIVE_KEYS.has(key)) {
            continue;
        }
        const oldVal = serializeAuditValue(before[key]);
        const newVal = serializeAuditValue(after[key]);
        if (!valuesEqual(oldVal, newVal)) {
            fields[key] = { old: oldVal, new: newVal };
        }
    }
    return { fields };
};
/** Converte registro Drizzle em objeto plano para diff. */
export const toAuditRecord = (row) => ({ ...row });
