export type LoggableErrorCause = {
  name: string;
  message: string;
  code?: string;
  detail?: string;
  hint?: string;
};

type ErrorWithPostgresFields = Error & {
  code?: string;
  detail?: string;
  hint?: string;
  cause?: unknown;
};

const toLoggableCause = (error: Error): LoggableErrorCause => {
  const pg = error as ErrorWithPostgresFields;
  const cause: LoggableErrorCause = {
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

const collectErrorChain = (error: unknown): Error[] => {
  const chain: Error[] = [];
  let current: unknown = error;

  while (current instanceof Error) {
    chain.push(current);
    current = (current as ErrorWithPostgresFields).cause;
  }

  return chain;
};

/**
 * Extrai a causa mais especifica de uma cadeia de erros (ex.: Drizzle → Postgres)
 * para logs de diagnostico, sem expor dados sensiveis alem do que o driver ja traz.
 */
export const extractLoggableErrorCause = (
  error: unknown,
): LoggableErrorCause | undefined => {
  const chain = collectErrorChain(error);
  if (chain.length === 0) {
    return undefined;
  }

  for (let i = chain.length - 1; i >= 0; i -= 1) {
    const candidate = chain[i] as ErrorWithPostgresFields;
    if (typeof candidate.code === "string" && candidate.code.length > 0) {
      return toLoggableCause(candidate);
    }
  }

  return toLoggableCause(chain[chain.length - 1]!);
};
