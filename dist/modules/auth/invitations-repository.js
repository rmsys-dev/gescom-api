import { randomInt } from "crypto";
import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import { enterprises, enterprisesMembers, userInvitations, usersCredentials, } from "../../db/schema.js";
import { env } from "../../config/env.js";
import { softDeleteValues, touchUpdatedAt, } from "../../shared/db/record-lifecycle.js";
export const generateNumericInviteCode = () => {
    const len = env.INVITATION_CODE_LENGTH;
    const max = 10 ** len - 1;
    const min = 10 ** (len - 1);
    return String(randomInt(min, max + 1));
};
export const invalidatePendingInvites = async (input, executor = db) => {
    const now = new Date();
    await executor
        .update(userInvitations)
        .set(softDeleteValues(now))
        .where(and(eq(userInvitations.userId, input.userId), eq(userInvitations.purpose, input.purpose), isNull(userInvitations.consumedAt), isNull(userInvitations.deletedAt)));
};
export const createInvitationRow = async (input, executor = db) => {
    const [row] = await executor
        .insert(userInvitations)
        .values({
        userId: input.userId,
        purpose: input.purpose,
        memberId: input.memberId ?? null,
        codeHash: input.codeHash,
        channel: input.channel,
        sentTo: input.sentTo,
        maxAttempts: input.maxAttempts,
        expiresAt: input.expiresAt,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        status: "ATIVO",
    })
        .returning();
    return row;
};
export const findPendingInviteFirstAccessForUser = async (userId) => {
    const rows = await db
        .select()
        .from(userInvitations)
        .where(and(eq(userInvitations.userId, userId), eq(userInvitations.purpose, "FIRST_ACCESS"), isNull(userInvitations.consumedAt), isNull(userInvitations.deletedAt)))
        .limit(1);
    return rows[0] ?? null;
};
export const countInvitationsByUserSince = async (input) => {
    const rows = await db
        .select({ total: count() })
        .from(userInvitations)
        .where(and(eq(userInvitations.userId, input.userId), eq(userInvitations.purpose, input.purpose), gte(userInvitations.createdAt, input.since)));
    return rows[0]?.total ?? 0;
};
export const incrementInviteAttempts = async (inviteId, previousAttempts, executor = db) => {
    const now = new Date();
    await executor
        .update(userInvitations)
        .set({ attempts: previousAttempts + 1, ...touchUpdatedAt(now) })
        .where(and(eq(userInvitations.id, inviteId), isNull(userInvitations.deletedAt)));
};
export const consumeInvite = async (inviteId, executor = db) => {
    const now = new Date();
    await executor
        .update(userInvitations)
        .set({ consumedAt: now, ...touchUpdatedAt(now) })
        .where(and(eq(userInvitations.id, inviteId), isNull(userInvitations.deletedAt)));
};
export const softDeleteInvite = async (inviteId, executor = db) => {
    const now = new Date();
    await executor
        .update(userInvitations)
        .set(softDeleteValues(now))
        .where(and(eq(userInvitations.id, inviteId), isNull(userInvitations.deletedAt)));
};
export const userHasAnyActiveCredential = async (userId) => {
    const rows = await db
        .select({ id: usersCredentials.id })
        .from(usersCredentials)
        .where(and(eq(usersCredentials.userId, userId), isNull(usersCredentials.deletedAt)))
        .limit(1);
    return rows.length > 0;
};
export const findApprovedActiveMembershipIdForUser = async (userId) => {
    const rows = await db
        .select({ id: enterprisesMembers.id })
        .from(enterprisesMembers)
        .innerJoin(enterprises, eq(enterprises.id, enterprisesMembers.enterpriseId))
        .where(and(eq(enterprisesMembers.userId, userId), eq(enterprisesMembers.status, "ATIVO"), isNull(enterprisesMembers.deletedAt), eq(enterprises.status, "ATIVO"), isNull(enterprises.deletedAt)))
        .orderBy(desc(enterprisesMembers.approvedAt), desc(enterprisesMembers.createdAt))
        .limit(1);
    return rows[0]?.id ?? null;
};
export const isInviteExpired = (invite) => invite.expiresAt.getTime() <= Date.now();
