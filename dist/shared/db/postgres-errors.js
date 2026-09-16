export const POSTGRES_UNIQUE_VIOLATION = "23505";
export const POSTGRES_FOREIGN_KEY_VIOLATION = "23503";
const MAX_CAUSE_DEPTH = 4;
const hasPostgresCode = (err, code) => {
    let current = err;
    for (let depth = 0; depth < MAX_CAUSE_DEPTH && current !== undefined && current !== null; depth++) {
        if (typeof current === "object" &&
            current !== null &&
            "code" in current &&
            current.code === code) {
            return true;
        }
        current =
            typeof current === "object" &&
                current !== null &&
                "cause" in current &&
                current.cause !== undefined
                ? current.cause
                : undefined;
    }
    return false;
};
export const isPostgresUniqueViolation = (err) => hasPostgresCode(err, POSTGRES_UNIQUE_VIOLATION);
export const isPostgresForeignKeyViolation = (err) => hasPostgresCode(err, POSTGRES_FOREIGN_KEY_VIOLATION);
