import { timingSafeEqual } from "node:crypto";
import { env } from "../../config/env.js";
import { UnauthorizedError } from "../../shared/errors/app-error.js";
/** Cabeçalho esperado; preferível a query string para evitar vazamento em logs e histórico. */
export const MAINTAINER_API_KEY_HEADER = "x-maintainer-api-key";
function keysMatch(provided, expected) {
    if (provided === undefined || provided.length === 0) {
        return false;
    }
    const a = Buffer.from(provided, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) {
        return false;
    }
    return timingSafeEqual(a, b);
}
export const requireMaintainerApiKey = (req, _res, next) => {
    const provided = req.header(MAINTAINER_API_KEY_HEADER);
    if (!keysMatch(provided, env.MAINTAINER_API_KEY)) {
        next(new UnauthorizedError("Chave de maintainer invalida ou ausente", "MAINTAINER_API_KEY_INVALID"));
        return;
    }
    next();
};
