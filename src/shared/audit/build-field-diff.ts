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

export type FieldDiff = {
  fields: Record<string, { old: unknown; new: unknown }>;
};

const serializeAuditValue = (value: unknown): unknown => {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (value === undefined) {
    return null;
  }
  return value;
};

const valuesEqual = (a: unknown, b: unknown): boolean => {
  const sa = serializeAuditValue(a);
  const sb = serializeAuditValue(b);
  if (sa === sb) {
    return true;
  }
  if (
    typeof sa === "object" &&
    sa !== null &&
    typeof sb === "object" &&
    sb !== null
  ) {
    return JSON.stringify(sa) === JSON.stringify(sb);
  }
  return false;
};

/** Monta diff campo a campo entre dois snapshots (ignora campos sensíveis). */
export const buildFieldDiff = (
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  keys?: string[],
): FieldDiff => {
  const fields: Record<string, { old: unknown; new: unknown }> = {};
  const keysToCheck =
    keys ??
    [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
      (k) => !SENSITIVE_KEYS.has(k),
    );

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
export const toAuditRecord = (
  row: Record<string, unknown>,
): Record<string, unknown> => ({ ...row });
