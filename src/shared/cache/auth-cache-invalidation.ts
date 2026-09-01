import { MS_PER_MINUTE, MS_PER_SECOND } from "../time/duration.js";
import { memoryCache } from "./memory-cache.js";

/** TTL curto: revogações de sessão invalidam explicitamente; TTL é rede de segurança. */
export const AUTH_SESSION_TTL_MS = 60 * MS_PER_SECOND;
export const AUTH_MEMBERSHIP_TTL_MS = 60 * MS_PER_SECOND;
export const AUTH_PERMISSIONS_TTL_MS = 5 * MS_PER_MINUTE;
export const AUTH_PARAMETERS_TTL_MS = 5 * MS_PER_MINUTE;

export const authCacheKeys = {
  session: (sessionId: string) => `auth:session:${sessionId}`,
  membership: (memberId: string, userId: string) =>
    `auth:membership:${memberId}:${userId}`,
  permissions: (memberId: string) => `auth:permissions:${memberId}`,
  enterpriseParameters: (enterpriseId: string) =>
    `auth:enterprise-parameters:${enterpriseId}`,
} as const;

export const invalidateAuthSession = (sessionId: string): void => {
  memoryCache.delete(authCacheKeys.session(sessionId));
};

export const invalidateAuthSessions = (sessionIds: readonly string[]): void => {
  for (const sessionId of sessionIds) {
    invalidateAuthSession(sessionId);
  }
};

export const invalidateMembershipContext = (
  memberId: string,
  userId: string,
): void => {
  memoryCache.delete(authCacheKeys.membership(memberId, userId));
};

export const invalidateMemberPermissions = (memberId: string): void => {
  memoryCache.delete(authCacheKeys.permissions(memberId));
};

export const invalidateEnterpriseParameters = (enterpriseId: string): void => {
  memoryCache.delete(authCacheKeys.enterpriseParameters(enterpriseId));
};
