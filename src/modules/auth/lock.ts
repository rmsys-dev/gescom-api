import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import { usersCredentials } from "../../db/schema.js";
import { env } from "../../config/env.js";
import { LockedError } from "../../shared/errors/app-error.js";
import { MS_PER_MINUTE } from "../../shared/time/duration.js";

const MAX_LOCK_MINUTES = 60;

type CredentialLockState = {
  id: string;
  failedAttempts: number;
  lockedUntil: Date | null;
};

export const assertNotLocked = (state: CredentialLockState): void => {
  if (state.lockedUntil && state.lockedUntil.getTime() > Date.now()) {
    throw new LockedError(
      "Conta temporariamente bloqueada por excesso de tentativas",
      "ACCOUNT_LOCKED",
    );
  }
};

const computeLockMinutes = (failedAttempts: number): number => {
  const blockCount = Math.max(
    0,
    failedAttempts - env.AUTH_MAX_FAILED_ATTEMPTS + 1,
  );
  if (blockCount <= 0) {
    return 0;
  }
  const exponential = env.AUTH_LOCK_BASE_MINUTES * Math.pow(2, blockCount - 1);
  return Math.min(MAX_LOCK_MINUTES, exponential);
};

export const registerFailure = async (
  credentialId: string,
  currentFailedAttempts: number,
): Promise<void> => {
  const now = new Date();
  const newAttempts = currentFailedAttempts + 1;
  const lockMinutes = computeLockMinutes(newAttempts);
  const lockedUntil =
    lockMinutes > 0
      ? new Date(now.getTime() + lockMinutes * MS_PER_MINUTE)
      : null;

  await db
    .update(usersCredentials)
    .set({
      failedAttempts: newAttempts,
      lastFailedAt: now,
      lockedUntil,
      updatedAt: now,
    })
    .where(
      and(
        eq(usersCredentials.id, credentialId),
        isNull(usersCredentials.deletedAt),
      ),
    );
};

export const resetFailures = async (credentialId: string): Promise<void> => {
  const now = new Date();
  await db
    .update(usersCredentials)
    .set({
      failedAttempts: 0,
      lockedUntil: null,
      lastLoginAt: now,
      updatedAt: now,
    })
    .where(
      and(
        eq(usersCredentials.id, credentialId),
        isNull(usersCredentials.deletedAt),
      ),
    );
};
