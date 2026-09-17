/** Versão major da API exposta em path (`/api/v1/...`). */
export const API_VERSION = "v1" as const;

/** Prefixo base de todas as rotas versionadas da API. */
export const API_BASE_PATH = `/api/${API_VERSION}` as const;
