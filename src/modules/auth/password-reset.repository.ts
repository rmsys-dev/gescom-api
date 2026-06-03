import { randomInt } from "crypto";
import { and, count, eq, gte, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import { passwordResetTokens } from "../../db/schema.js";
import { env } from "../../config/env.js";
import {
  softDeleteValues,
  touchUpdatedAt,
} from "../../shared/db/record-lifecycle.js";
import type { DbExecutor } from "./repository.js";

export const generateNumericPasswordResetCode = (): string => {
  const len = env.PASSWORD_RESET_CODE_LENGTH;
  const max = 10 ** len - 1;
  const min = 10 ** (len - 1);
  return String(randomInt(min, max + 1));
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
    })
    .returning();
  return row;
};

export const findPendingPasswordResetTokenForUser = async (
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
