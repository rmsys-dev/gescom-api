import { PERM } from "../../modules/auth/default-permissions.js";
import { isAllowed, resolvePermissions } from "../../modules/auth/permissions.js";
import { NotFoundError } from "../errors/app-error.js";
export const resolveUserReadAccess = async (req, _res, next) => {
    try {
        const reqWithAuth = req;
        const targetUserId = req.params["userId"];
        if (reqWithAuth.auth.userId === targetUserId) {
            req.userReadAccess = {
                targetUserId,
                readMode: "self",
            };
            next();
            return;
        }
        const memberId = reqWithAuth.auth.memberId;
        const enterpriseId = reqWithAuth.auth.enterpriseId;
        if (!memberId || !enterpriseId) {
            throw new NotFoundError("Usuario nao encontrado", "USER_NOT_FOUND");
        }
        const resolved = await resolvePermissions(memberId);
        if (isAllowed(resolved, PERM.consultar_usuarios)) {
            req.userReadAccess = {
                targetUserId,
                readMode: "directory",
            };
            next();
            return;
        }
        throw new NotFoundError("Usuario nao encontrado", "USER_NOT_FOUND");
    }
    catch (error) {
        next(error);
    }
};
