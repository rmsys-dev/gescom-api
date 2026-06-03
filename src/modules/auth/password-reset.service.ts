import { db } from "../../db/schema.js";
import { env } from "../../config/env.js";
import {
  InternalServerError,
  TooManyRequestsError,
  UnauthorizedError,
} from "../../shared/errors/app-error.js";
import { sendPasswordResetCode } from "../../shared/notifications/email-sender.js";
import {
  addMinutesFromNow,
  subtractMinutesFromNow,
} from "../../shared/time/duration.js";
import { type AuthLoginType, writeAudit } from "./audit.js";
import {
  findActiveCredentialsByUserId,
  findUserByEmail,
  findUserByRegistration,
  revokeAllSessionsForUser,
  updateActiveCredentialsPasswordForUser,
} from "./repository.js";
import {
  consumePasswordResetToken,
  countPasswordResetTokensByUserSince,
  createPasswordResetToken,
  findPendingPasswordResetTokenForUser,
  generateNumericPasswordResetCode,
  incrementPasswordResetAttempts,
  invalidatePendingPasswordResetTokens,
  isPasswordResetTokenExpired,
  softDeletePasswordResetToken,
} from "./password-reset.repository.js";
import { hashPassword, normalizeLogin, verifyPassword } from "./password.js";

type AuthMeta = {
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
};

const genericOk = (): { ok: true } => ({ ok: true });

const resolveUserByLoginType = async (
  loginType: AuthLoginType,
  normalized: string,
) => {
  if (loginType === "EMAIL") {
    return findUserByEmail(normalized);
  }
  return findUserByRegistration(normalized);
};

const assertPasswordResetEmailSendLimit = async (
  input: {
    userId: string;
    login: string;
    loginType: AuthLoginType;
  } & AuthMeta,
): Promise<void> => {
  const since = subtractMinutesFromNow(
    env.PASSWORD_RESET_EMAIL_LIMIT_WINDOW_MINUTES,
  );
  const sentInWindow = await countPasswordResetTokensByUserSince({
    userId: input.userId,
    since,
  });

  if (sentInWindow >= env.PASSWORD_RESET_EMAIL_LIMIT_MAX) {
    await writeAudit({
      event: "PASSWORD_RESET_RATE_LIMITED",
      userId: input.userId,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Limite de envios de codigo de redefinicao de senha excedido",
    });
    throw new TooManyRequestsError(
      "Limite de envio de codigo excedido. Tente novamente mais tarde.",
      "PASSWORD_RESET_EMAIL_RATE_LIMITED",
    );
  }
};

export const passwordResetRequest = async (
  input: {
    loginType: AuthLoginType;
    login: string;
  } & AuthMeta,
): Promise<{ ok: true }> => {
  const normalized = normalizeLogin(input.loginType, input.login);
  const user = await resolveUserByLoginType(input.loginType, normalized);

  if (!user || user.status !== "ATIVO") {
    await writeAudit({
      event: "PASSWORD_RESET_FAILED",
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Usuario inexistente ou inativo",
    });
    return genericOk();
  }

  const credentials = await findActiveCredentialsByUserId(user.id);
  if (credentials.length === 0) {
    await writeAudit({
      event: "PASSWORD_RESET_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Usuario sem credencial ativa",
    });
    return genericOk();
  }

  await assertPasswordResetEmailSendLimit({
    userId: user.id,
    login: input.login,
    loginType: input.loginType,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    requestId: input.requestId,
  });

  const plainCode = generateNumericPasswordResetCode();
  const codeHash = await hashPassword(plainCode);
  const expiresAt = addMinutesFromNow(env.PASSWORD_RESET_CODE_TTL_MINUTES);

  try {
    await db.transaction(async (tx) => {
      await invalidatePendingPasswordResetTokens(user.id, tx);
      await createPasswordResetToken(
        {
          userId: user.id,
          codeHash,
          channel: "EMAIL",
          sentTo: user.userEmail,
          maxAttempts: env.PASSWORD_RESET_MAX_ATTEMPTS,
          expiresAt,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
        tx,
      );
    });

    await sendPasswordResetCode({
      to: user.userEmail,
      code: plainCode,
      userName: user.userName,
    });

    await writeAudit({
      event: "PASSWORD_RESET_REQUESTED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
    });
  } catch (error) {
    const reason =
      error instanceof Error
        ? error.message
        : "Falha ao criar token de redefinicao de senha";

    await writeAudit({
      event: "PASSWORD_RESET_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason,
    });

    throw new InternalServerError(
      "Nao foi possivel enviar o e-mail de redefinicao de senha",
      "PASSWORD_RESET_EMAIL_DELIVERY_FAILED",
      [{ path: "email", message: reason }],
    );
  }

  return genericOk();
};

export const passwordResetVerify = async (
  input: {
    loginType: AuthLoginType;
    login: string;
    code: string;
    password: string;
    confirmPassword: string;
  } & AuthMeta,
): Promise<{ ok: true }> => {
  if (input.password !== input.confirmPassword) {
    throw new UnauthorizedError("Senhas nao conferem", "PASSWORD_MISMATCH");
  }

  const normalized = normalizeLogin(input.loginType, input.login);
  const user = await resolveUserByLoginType(input.loginType, normalized);

  if (!user || user.status !== "ATIVO") {
    await writeAudit({
      event: "PASSWORD_RESET_FAILED",
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Usuario invalido para redefinicao de senha",
    });
    throw new UnauthorizedError(
      "Nao foi possivel concluir a redefinicao de senha",
      "PASSWORD_RESET_INVALID",
    );
  }

  const credentials = await findActiveCredentialsByUserId(user.id);
  if (credentials.length === 0) {
    await writeAudit({
      event: "PASSWORD_RESET_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Usuario sem credencial ativa durante verify",
    });
    throw new UnauthorizedError(
      "Nao foi possivel concluir a redefinicao de senha",
      "PASSWORD_RESET_INVALID",
    );
  }

  const token = await findPendingPasswordResetTokenForUser(user.id);

  if (!token || isPasswordResetTokenExpired(token)) {
    if (token) {
      await softDeletePasswordResetToken(token.id);
    }
    await writeAudit({
      event: "PASSWORD_RESET_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Token ausente ou expirado",
    });
    throw new UnauthorizedError(
      "Codigo invalido ou expirado",
      "PASSWORD_RESET_INVALID",
    );
  }

  const codeDigits = input.code.replace(/\D/g, "");
  const codeOk = await verifyPassword(codeDigits, token.codeHash);

  if (!codeOk) {
    const nextAttempts = token.attempts + 1;
    await incrementPasswordResetAttempts(token.id, token.attempts);
    if (nextAttempts >= token.maxAttempts) {
      await softDeletePasswordResetToken(token.id);
    }

    await writeAudit({
      event: "PASSWORD_RESET_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason:
        nextAttempts >= token.maxAttempts
          ? "Max tentativas de codigo"
          : "Codigo incorreto",
    });

    throw new UnauthorizedError(
      "Codigo invalido ou expirado",
      "PASSWORD_RESET_INVALID",
    );
  }

  const passwordHash = await hashPassword(input.password);

  await db.transaction(async (tx) => {
    await consumePasswordResetToken(token.id, tx);
    await updateActiveCredentialsPasswordForUser(user.id, passwordHash, tx);
    await revokeAllSessionsForUser(user.id, "PASSWORD_RESET", tx);
  });

  await writeAudit({
    event: "PASSWORD_RESET_VERIFIED",
    userId: user.id,
    loginAttempt: input.login,
    loginType: input.loginType,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    requestId: input.requestId,
    reason: "Senha redefinida com sucesso",
  });

  return genericOk();
};

export const passwordResetResend = async (
  input: {
    loginType: AuthLoginType;
    login: string;
  } & AuthMeta,
): Promise<{ ok: true }> => passwordResetRequest(input);
