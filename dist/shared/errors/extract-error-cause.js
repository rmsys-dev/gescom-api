const toLoggableCause = (error) => {
    const pg = error;
    const cause = {
        name: error.name,
        message: error.message,
    };
    if (typeof pg.code === "string" && pg.code.length > 0) {
        cause.code = pg.code;
    }
    if (typeof pg.detail === "string" && pg.detail.length > 0) {
        cause.detail = pg.detail;
    }
    if (typeof pg.hint === "string" && pg.hint.length > 0) {
        cause.hint = pg.hint;
    }
    return cause;
};
const collectErrorChain = (error) => {
    const chain = [];
    let current = error;
    while (current instanceof Error) {
        chain.push(current);
        current = current.cause;
    }
    return chain;
};
/**
 * Extrai a causa mais especifica de uma cadeia de erros (ex.: Drizzle → Postgres)
 * para logs de diagnostico, sem expor dados sensiveis alem do que o driver ja traz.
 */
export const extractLoggableErrorCause = (error) => {
    const chain = collectErrorChain(error);
    if (chain.length === 0) {
        return undefined;
    }
    for (let i = chain.length - 1; i >= 0; i -= 1) {
        const candidate = chain[i];
        if (typeof candidate.code === "string" && candidate.code.length > 0) {
            return toLoggableCause(candidate);
        }
    }
    return toLoggableCause(chain[chain.length - 1]);
};
