import { randomBytes, randomInt, timingSafeEqual } from "crypto";
import { and, count, desc, eq, gte, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import {
  enterprises,
  enterprisesMembers,
  userInvitations,
  usersCredentials,
} from "../../db/schema.js";
import { env } from "../../config/env.js";
import {
  softDeleteValues,
  touchUpdatedAt,
} from "../../shared/db/record-lifecycle.js";
import { hashRefreshToken } from "./tokens.js";
import type { DbExecutor } from "./repository.js";

export type InvitePurpose = "FIRST_ACCESS";

export const generateNumericInviteCode = (): string => {
  const len = env.INVITATION_CODE_LENGTH;
  const max = 10 ** len - 1;
  const min = 10 ** (len - 1);
  return String(randomInt(min, max + 1));
};

export const generateInviteConfirmToken = (): string =>
  randomBytes(32).toString("base64url");

export const hashInviteConfirmToken = (token: string): string =>
  hashRefreshToken(token);

export const inviteConfirmTokensMatch = (
  plainToken: string,
  storedHash: string | null,
): boolean => {
  if (!storedHash) {
    return false;
  }

  const incoming = Buffer.from(hashInviteConfirmToken(plainToken), "hex");
  const stored = Buffer.from(storedHash, "hex");

  if (incoming.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(incoming, stored);
};

export const invalidatePendingInvites = async (
  input: {
    userId: string;
    purpose: InvitePurpose;
  },
  executor: DbExecutor = db,
): Promise<void> => {
  const now = new Date();

  await executor
    .update(userInvitations)
    .set(softDeleteValues(now))
    .where(
      and(
        eq(userInvitations.userId, input.userId),
        eq(userInvitations.purpose, input.purpose),
        isNull(userInvitations.consumedAt),
        isNull(userInvitations.deletedAt),
      ),
    );
};

export const createInvitationRow = async (
  input: {
    userId: string;
    purpose: InvitePurpose;
    memberId?: string | null;
    codeHash: string;
    channel: "EMAIL" | "SMS" | "WHATSAPP";
    sentTo: string;
    maxAttempts: number;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  },
  executor: DbExecutor = db,
): Promise<typeof userInvitations.$inferSelect> => {
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
      checkStatus: "PENDENTE",
    })
    .returning();
  return row;
};

export const findOpenInviteFirstAccessForUser = async (
  userId: string,
): Promise<typeof userInvitations.$inferSelect | null> => {
  const rows = await db
    .select()
    .from(userInvitations)
    .where(
      and(
        eq(userInvitations.userId, userId),
        eq(userInvitations.purpose, "FIRST_ACCESS"),
        isNull(userInvitations.consumedAt),
        isNull(userInvitations.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
};

/** @deprecated Use findOpenInviteFirstAccessForUser */
export const findPendingInviteFirstAccessForUser =
  findOpenInviteFirstAccessForUser;

export const findVerifiedInviteFirstAccessForUser = async (
  userId: string,
): Promise<typeof userInvitations.$inferSelect | null> => {
  const rows = await db
    .select()
    .from(userInvitations)
    .where(
      and(
        eq(userInvitations.userId, userId),
        eq(userInvitations.purpose, "FIRST_ACCESS"),
        eq(userInvitations.checkStatus, "VERIFICADO"),
        isNull(userInvitations.consumedAt),
        isNull(userInvitations.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
};

export const markInviteVerified = async (
  input: {
    inviteId: string;
    resetTokenHash: string;
  },
  executor: DbExecutor = db,
): Promise<void> => {
  const now = new Date();
  await executor
    .update(userInvitations)
    .set({
      checkStatus: "VERIFICADO",
      verifiedAt: now,
      resetTokenHash: input.resetTokenHash,
      ...touchUpdatedAt(now),
    })
    .where(
      and(
        eq(userInvitations.id, input.inviteId),
        isNull(userInvitations.deletedAt),
        isNull(userInvitations.consumedAt),
      ),
    );
};

export const countInvitationsByUserSince = async (input: {
  userId: string;
  purpose: InvitePurpose;
  since: Date;
}): Promise<number> => {
  const rows = await db
    .select({ total: count() })
    .from(userInvitations)
    .where(
      and(
        eq(userInvitations.userId, input.userId),
        eq(userInvitations.purpose, input.purpose),
        gte(userInvitations.createdAt, input.since),
      ),
    );
  return rows[0]?.total ?? 0;
};

export const incrementInviteAttempts = async (
  inviteId: string,
  previousAttempts: number,
  executor: DbExecutor = db,
): Promise<void> => {
  const now = new Date();
  await executor
    .update(userInvitations)
    .set({ attempts: previousAttempts + 1, ...touchUpdatedAt(now) })
    .where(
      and(eq(userInvitations.id, inviteId), isNull(userInvitations.deletedAt)),
    );
};

export const consumeInvite = async (
  inviteId: string,
  executor: DbExecutor = db,
): Promise<void> => {
  const now = new Date();
  await executor
    .update(userInvitations)
    .set({ consumedAt: now, ...touchUpdatedAt(now) })
    .where(
      and(eq(userInvitations.id, inviteId), isNull(userInvitations.deletedAt)),
    );
};

export const softDeleteInvite = async (
  inviteId: string,
  executor: DbExecutor = db,
): Promise<void> => {
  const now = new Date();
  await executor
    .update(userInvitations)
    .set(softDeleteValues(now))
    .where(
      and(eq(userInvitations.id, inviteId), isNull(userInvitations.deletedAt)),
    );
};

export const userHasAnyActiveCredential = async (
  userId: string,
): Promise<boolean> => {
  const rows = await db
    .select({ id: usersCredentials.id })
    .from(usersCredentials)
    .where(
      and(
        eq(usersCredentials.userId, userId),
        isNull(usersCredentials.deletedAt),
      ),
    )
    .limit(1);
  return rows.length > 0;
};

export const findApprovedActiveMembershipIdForUser = async (
  userId: string,
): Promise<string | null> => {
  const rows = await db
    .select({ id: enterprisesMembers.id })
    .from(enterprisesMembers)
    .innerJoin(enterprises, eq(enterprises.id, enterprisesMembers.enterpriseId))
    .where(
      and(
        eq(enterprisesMembers.userId, userId),
        eq(enterprisesMembers.status, "ATIVO"),
        isNull(enterprisesMembers.deletedAt),
        eq(enterprises.status, "ATIVO"),
        isNull(enterprises.deletedAt),
      ),
    )
    .orderBy(
      desc(enterprisesMembers.approvedAt),
      desc(enterprisesMembers.createdAt),
    )
    .limit(1);
  return rows[0]?.id ?? null;
};

export const isInviteExpired = (invite: { expiresAt: Date }): boolean =>
  invite.expiresAt.getTime() <= Date.now();

export const isInviteConfirmWindowExpired = (invite: {
  expiresAt: Date;
  verifiedAt: Date | null;
}): boolean => {
  if (isInviteExpired(invite)) {
    return true;
  }

  if (!invite.verifiedAt) {
    return true;
  }

  const confirmDeadline =
    invite.verifiedAt.getTime() +
    env.FIRST_ACCESS_CONFIRM_TTL_MINUTES * 60 * 1000;

  return Math.min(invite.expiresAt.getTime(), confirmDeadline) <= Date.now();
};
