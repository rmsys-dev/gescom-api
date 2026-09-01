import { eq } from "drizzle-orm";
import {
  findMembershipContextByMemberIdForUser,
  findSessionById,
  type MembershipContext,
  type SessionRow,
} from "../../modules/auth/repository.js";
import { db, enterprisesMembers } from "../../db/schema.js";
import { memoryCache } from "./memory-cache.js";
import {
  AUTH_MEMBERSHIP_TTL_MS,
  AUTH_SESSION_TTL_MS,
  authCacheKeys,
  invalidateMembershipContext,
} from "./auth-cache-invalidation.js";

export {
  AUTH_MEMBERSHIP_TTL_MS,
  AUTH_PARAMETERS_TTL_MS,
  AUTH_PERMISSIONS_TTL_MS,
  AUTH_SESSION_TTL_MS,
  authCacheKeys,
  invalidateAuthSession,
  invalidateAuthSessions,
  invalidateEnterpriseParameters,
  invalidateMemberPermissions,
  invalidateMembershipContext,
} from "./auth-cache-invalidation.js";

export const getCachedSession = (
  sessionId: string,
): Promise<SessionRow | null> =>
  memoryCache.getOrSet(authCacheKeys.session(sessionId), AUTH_SESSION_TTL_MS, () =>
    findSessionById(sessionId),
  );

export const getCachedMembershipContext = (
  memberId: string,
  userId: string,
): Promise<MembershipContext | null> =>
  memoryCache.getOrSet(
    authCacheKeys.membership(memberId, userId),
    AUTH_MEMBERSHIP_TTL_MS,
    () => findMembershipContextByMemberIdForUser(memberId, userId),
  );

/** Invalida o vínculo membro↔utilizador após desativação ou alteração de status. */
export const invalidateMembershipContextForMember = async (
  memberId: string,
): Promise<void> => {
  const row = (
    await db
      .select({ userId: enterprisesMembers.userId })
      .from(enterprisesMembers)
      .where(eq(enterprisesMembers.id, memberId))
      .limit(1)
  )[0];
  if (row) {
    invalidateMembershipContext(memberId, row.userId);
  }
};
