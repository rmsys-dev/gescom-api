import { randomBytes, randomInt, timingSafeEqual } from "crypto";
import { and, count, eq, gte, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import { passwordResetTokens } from "../../db/schema.js";
import { env } from "../../config/env.js";
import {
  softDeleteValues,
  touchUpdatedAt,
} from "../../shared/db/record-lifecycle.js";
import { hashRefreshToken } from "./tokens.js";
import type { DbExecutor } from "./repository.js";

export const generateNumericPasswordResetCode = (): string => {
  const len = env.PASSWORD_RESET_CODE_LENGTH;
  const max = 10 ** len - 1;
  const min = 10 ** (len - 1);
  return String(randomInt(min, max + 1));
};

export const generatePasswordResetConfirmToken = (): string =>
  randomBytes(32).toString("base64url");

export const hashPasswordResetConfirmToken = (token: string): string =>
  hashRefreshToken(token);

export const passwordResetConfirmTokensMatch = (
  plainToken: string,
  storedHash: string | null,
): boolean => {
  if (!storedHash) {
    return false;
  }

  const incoming = Buffer.from(
    hashPasswordResetConfirmToken(plainToken),
    "hex",
  );
  const stored = Buffer.from(storedHash, "hex");

  if (incoming.length !== stored.length) {
    return false;
  }

  return timingSafeEqual(incoming, stored);
};

export const invalidatePendingPasswordResetTokens = async (
  userId: string,
  executor: DbExecutor = db,
): Promise<void> => {
  const now = new Date();
  await executor
    .update(passwordResetTokens)
    .set(softDeleteValues(now))
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        eq(passwordResetTokens.status, "ATIVO"),
        isNull(passwordResetTokens.consumedAt),
        isNull(passwordResetTokens.deletedAt),
      ),
    );
};

export const createPasswordResetToken = async (
  input: {
    userId: string;
    codeHash: string;
    channel: "EMAIL" | "SMS" | "WHATSAPP";
    sentTo: string;
    maxAttempts: number;
    expiresAt: Date;
    ipAddress: string | null;
    userAgent: string | null;
  },
  executor: DbExecutor = db,
): Promise<typeof passwordResetTokens.$inferSelect> => {
  const [row] = await executor
    .insert(passwordResetTokens)
    .values({
      userId: input.userId,
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

export const findOpenPasswordResetTokenForUser = async (
  userId: string,
): Promise<typeof passwordResetTokens.$inferSelect | null> => {
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        eq(passwordResetTokens.status, "ATIVO"),
        isNull(passwordResetTokens.consumedAt),
        isNull(passwordResetTokens.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
};

/** @deprecated Use findOpenPasswordResetTokenForUser */
export const findPendingPasswordResetTokenForUser =
  findOpenPasswordResetTokenForUser;

export const findVerifiedPasswordResetTokenForUser = async (
  userId: string,
): Promise<typeof passwordResetTokens.$inferSelect | null> => {
  const rows = await db
    .select()
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, userId),
        eq(passwordResetTokens.status, "ATIVO"),
        eq(passwordResetTokens.checkStatus, "VERIFICADO"),
        isNull(passwordResetTokens.consumedAt),
        isNull(passwordResetTokens.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
};

export const markPasswordResetTokenVerified = async (
  input: {
    tokenId: string;
    resetTokenHash: string;
  },
  executor: DbExecutor = db,
): Promise<void> => {
  const now = new Date();
  await executor
    .update(passwordResetTokens)
    .set({
      checkStatus: "VERIFICADO",
      verifiedAt: now,
      resetTokenHash: input.resetTokenHash,
      ...touchUpdatedAt(now),
    })
    .where(
      and(
        eq(passwordResetTokens.id, input.tokenId),
        isNull(passwordResetTokens.deletedAt),
        isNull(passwordResetTokens.consumedAt),
      ),
    );
};

export const countPasswordResetTokensByUserSince = async (input: {
  userId: string;
  since: Date;
}): Promise<number> => {
  const rows = await db
    .select({ total: count() })
    .from(passwordResetTokens)
    .where(
      and(
        eq(passwordResetTokens.userId, input.userId),
        gte(passwordResetTokens.createdAt, input.since),
      ),
    );
  return rows[0]?.total ?? 0;
};

export const incrementPasswordResetAttempts = async (
  tokenId: string,
  previousAttempts: number,
  executor: DbExecutor = db,
): Promise<void> => {
  const now = new Date();
  await executor
    .update(passwordResetTokens)
    .set({ attempts: previousAttempts + 1, ...touchUpdatedAt(now) })
    .where(
      and(
        eq(passwordResetTokens.id, tokenId),
        isNull(passwordResetTokens.deletedAt),
      ),
    );
};

export const consumePasswordResetToken = async (
  tokenId: string,
  executor: DbExecutor = db,
): Promise<void> => {
  const now = new Date();
  await executor
    .update(passwordResetTokens)
    .set({ consumedAt: now, ...touchUpdatedAt(now) })
    .where(
      and(
        eq(passwordResetTokens.id, tokenId),
        isNull(passwordResetTokens.deletedAt),
      ),
    );
};

export const softDeletePasswordResetToken = async (
  tokenId: string,
  executor: DbExecutor = db,
): Promise<void> => {
  const now = new Date();
  await executor
    .update(passwordResetTokens)
    .set(softDeleteValues(now))
    .where(
      and(
        eq(passwordResetTokens.id, tokenId),
        isNull(passwordResetTokens.deletedAt),
      ),
    );
};

export const isPasswordResetTokenExpired = (token: {
  expiresAt: Date;
}): boolean => token.expiresAt.getTime() <= Date.now();

export const isPasswordResetConfirmWindowExpired = (token: {
  expiresAt: Date;
  verifiedAt: Date | null;
}): boolean => {
  if (isPasswordResetTokenExpired(token)) {
    return true;
  }

  if (!token.verifiedAt) {
    return true;
  }

  const confirmDeadline =
    token.verifiedAt.getTime() +
    env.PASSWORD_RESET_CONFIRM_TTL_MINUTES * 60 * 1000;

  return Math.min(token.expiresAt.getTime(), confirmDeadline) <= Date.now();
};
