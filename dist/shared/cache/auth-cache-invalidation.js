import { MS_PER_MINUTE, MS_PER_SECOND } from "../time/duration.js";
import { memoryCache } from "./memory-cache.js";
/** TTL curto: revogações de sessão invalidam explicitamente; TTL é rede de segurança. */
export const AUTH_SESSION_TTL_MS = 60 * MS_PER_SECOND;
export const AUTH_MEMBERSHIP_TTL_MS = 60 * MS_PER_SECOND;
export const AUTH_PERMISSIONS_TTL_MS = 5 * MS_PER_MINUTE;
export const authCacheKeys = {
    session: (sessionId) => `auth:session:${sessionId}`,
    membership: (memberId, userId) => `auth:membership:${memberId}:${userId}`,
    permissions: (memberId) => `auth:permissions:${memberId}`,
};
export const invalidateAuthSession = (sessionId) => {
    memoryCache.delete(authCacheKeys.session(sessionId));
};
export const invalidateAuthSessions = (sessionIds) => {
    for (const sessionId of sessionIds) {
        invalidateAuthSession(sessionId);
    }
};
export const invalidateMembershipContext = (memberId, userId) => {
    memoryCache.delete(authCacheKeys.membership(memberId, userId));
};
export const invalidateMemberPermissions = (memberId) => {
    memoryCache.delete(authCacheKeys.permissions(memberId));
};
