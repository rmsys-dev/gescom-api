import { writeAudit } from "../../modules/auth/audit.js";
import { isAllowed, resolvePermissions } from "../../modules/auth/permissions.js";
import { ForbiddenError } from "../errors/app-error.js";
export const requirePermission = (permission) => {
    return requireAnyPermission([permission]);
};
export const requireAnyPermission = (permissions) => {
    return async (req, _res, next) => {
        try {
            const reqWithAuth = req;
            const reqWithId = req;
            if (!reqWithAuth.auth?.memberId) {
                await writeAudit({
                    event: "PERMISSION_DENIED",
                    userId: reqWithAuth.auth?.userId ?? null,
                    sessionId: reqWithAuth.auth?.sessionId ?? null,
                    enterpriseId: reqWithAuth.auth?.enterpriseId ?? null,
                    ipAddress: req.ip ?? null,
                    userAgent: req.header("user-agent") ?? null,
                    requestId: reqWithId.requestId ?? null,
                    reason: "Verificacao de permissao: memberId ausente",
                });
                throw new ForbiddenError("Contexto de membro ausente para verificacao de permissao", "MEMBER_CONTEXT_MISSING");
            }
            const resolved = await resolvePermissions(reqWithAuth.auth.memberId);
            const allowed = permissions.some((permission) => isAllowed(resolved, permission));
            if (!allowed) {
                await writeAudit({
                    event: "PERMISSION_DENIED",
                    userId: reqWithAuth.auth.userId,
                    sessionId: reqWithAuth.auth.sessionId,
                    enterpriseId: reqWithAuth.auth.enterpriseId ?? null,
                    ipAddress: req.ip ?? null,
                    userAgent: req.header("user-agent") ?? null,
                    requestId: reqWithId.requestId ?? null,
                    reason: `Permissao negada: ${permissions.join(" | ")}`,
                });
                throw new ForbiddenError("Permissao negada para esta operacao", "PERMISSION_DENIED");
            }
            next();
        }
        catch (error) {
            next(error);
        }
    };
};
export const requireSelfOrPermission = (permission, userIdParamName = "userId") => {
    const permHandler = requirePermission(permission);
    return (req, res, next) => {
        const reqAuth = req;
        const targetUserId = req.params[userIdParamName];
        if (targetUserId !== undefined && reqAuth.auth.userId === targetUserId) {
            next();
            return;
        }
        void permHandler(req, res, next);
    };
};
