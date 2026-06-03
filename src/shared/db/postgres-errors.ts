export const POSTGRES_UNIQUE_VIOLATION = "23505";

const MAX_CAUSE_DEPTH = 4;

export const isPostgresUniqueViolation = (err: unknown): boolean => {
  let current: unknown = err;
  for (
    let depth = 0;
    depth < MAX_CAUSE_DEPTH && current !== undefined && current !== null;
    depth++
  ) {
    if (
      typeof current === "object" &&
      current !== null &&
      "code" in current &&
      (current as { code?: string }).code === POSTGRES_UNIQUE_VIOLATION
    ) {
      return true;
    }
    current =
      typeof current === "object" &&
      current !== null &&
      "cause" in current &&
      (current as { cause?: unknown }).cause !== undefined
        ? (current as { cause: unknown }).cause
        : undefined;
  }
  return false;
};
