import { db } from "../../db/schema.js";
import { env } from "../../config/env.js";
import {
  ForbiddenError,
  InternalServerError,
  TooManyRequestsError,
  UnauthorizedError,
} from "../../shared/errors/app-error.js";
import { sendFirstAccessCode } from "../../shared/notifications/email-sender.js";
import {
  addMinutesFromNow,
  subtractMinutesFromNow,
} from "../../shared/time/duration.js";
import { type AuthLoginType, writeAudit } from "./audit.js";
import {
  createCredential,
  findActiveCredentialByLoginNormalized,
  findMembershipContextByMemberId,
  findUserByEmail,
  findUserByRegistration,
  revokeAllSessionsForUser,
} from "./repository.js";
import {
  consumeInvite,
  createInvitationRow,
  countInvitationsByUserSince,
  findApprovedActiveMembershipIdForUser,
  findOpenInviteFirstAccessForUser,
  findVerifiedInviteFirstAccessForUser,
  generateInviteConfirmToken,
  generateNumericInviteCode,
  hashInviteConfirmToken,
  incrementInviteAttempts,
  invalidatePendingInvites,
  inviteConfirmTokensMatch,
  isInviteConfirmWindowExpired,
  isInviteExpired,
  markInviteVerified,
  softDeleteInvite,
  userHasAnyActiveCredential,
} from "./invitations-repository.js";
import {
  hashPassword,
  normalizeCpfCnpj,
  normalizeEmail,
  normalizeLogin,
  verifyPassword,
} from "./password.js";
import { issueSessionTokens } from "./session-tokens.js";

type AuthMeta = {
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
};

const genericOk = (): { ok: true } => ({ ok: true });

const invalidFirstAccessError = (message = "Código inválido ou expirado") =>
  new UnauthorizedError(message, "FIRST_ACCESS_INVALID");

const resolveUserByLoginType = async (
  loginType: AuthLoginType,
  normalized: string,
) => {
  if (loginType === "EMAIL") {
    return findUserByEmail(normalized);
  }
  return findUserByRegistration(normalized);
};

const assertFirstAccessEmailSendLimit = async (
  input: {
    userId: string;
    login: string;
    loginType: AuthLoginType;
  } & AuthMeta,
): Promise<void> => {
  const since = subtractMinutesFromNow(
    env.FIRST_ACCESS_EMAIL_LIMIT_WINDOW_MINUTES,
  );
  const sentInWindow = await countInvitationsByUserSince({
    userId: input.userId,
    purpose: "FIRST_ACCESS",
    since,
  });

  if (sentInWindow >= env.FIRST_ACCESS_EMAIL_LIMIT_MAX) {
    await writeAudit({
      event: "CODE_RATE_LIMITED",
      userId: input.userId,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Limite de envios de codigo de primeiro acesso excedido",
    });
    throw new TooManyRequestsError(
      "Limite de envio de codigo excedido. Tente novamente mais tarde.",
      "FIRST_ACCESS_EMAIL_RATE_LIMITED",
    );
  }
};

export const firstAccessLookup = async (
  input: {
    loginType: AuthLoginType;
    login: string;
  } & AuthMeta,
): Promise<{ ok: true }> => {
  const normalized = normalizeLogin(input.loginType, input.login);

  const user = await resolveUserByLoginType(input.loginType, normalized);

  if (!user || user.status !== "ATIVO") {
    await writeAudit({
      event: "FIRST_ACCESS_FAILED",
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Usuario inexistente ou inativo",
    });
    return genericOk();
  }

  if (await userHasAnyActiveCredential(user.id)) {
    await writeAudit({
      event: "FIRST_ACCESS_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Usuario ja possui credencial",
    });
    return genericOk();
  }

  const approvedMemberId = await findApprovedActiveMembershipIdForUser(user.id);

  if (!approvedMemberId) {
    await writeAudit({
      event: "FIRST_ACCESS_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Sem vínculo aprovado ativo",
    });
    return genericOk();
  }

  await assertFirstAccessEmailSendLimit({
    userId: user.id,
    login: input.login,
    loginType: input.loginType,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    requestId: input.requestId,
  });

  if (!user.userEmail) {
    await writeAudit({
      event: "FIRST_ACCESS_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Usuario sem e-mail cadastrado",
    });
    return genericOk();
  }

  const recipientEmail = user.userEmail;

  const plainCode = generateNumericInviteCode();
  const codeHash = await hashPassword(plainCode);
  const expiresAt = addMinutesFromNow(env.INVITATION_CODE_TTL_MINUTES);

  try {
    await db.transaction(async (tx) => {
      await invalidatePendingInvites(
        { userId: user.id, purpose: "FIRST_ACCESS" },
        tx,
      );

      await createInvitationRow(
        {
          userId: user.id,
          purpose: "FIRST_ACCESS",
          memberId: approvedMemberId,
          codeHash,
          channel: "EMAIL",
          sentTo: recipientEmail,
          maxAttempts: env.INVITATION_MAX_ATTEMPTS,
          expiresAt,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
        },
        tx,
      );
    });

    await sendFirstAccessCode({
      to: recipientEmail,
      code: plainCode,
      userName: user.userName,
    });

    await writeAudit({
      event: "FIRST_ACCESS_REQUESTED",
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
        : "Falha ao criar codigo de primeiro acesso";

    await writeAudit({
      event: "FIRST_ACCESS_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason,
    });

    throw new InternalServerError(
      "Nao foi possivel enviar o e-mail de primeiro acesso",
      "EMAIL_DELIVERY_FAILED",
      [{ path: "email", message: reason }],
    );
  }

  return genericOk();
};

export const firstAccessVerify = async (
  input: {
    loginType: AuthLoginType;
    login: string;
    code: string;
  } & AuthMeta,
): Promise<{ resetToken: string }> => {
  const normalized = normalizeLogin(input.loginType, input.login);
  const user = await resolveUserByLoginType(input.loginType, normalized);

  if (!user || user.status !== "ATIVO") {
    await writeAudit({
      event: "FIRST_ACCESS_FAILED",
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Usuario invalido para verificacao de codigo",
    });
    throw invalidFirstAccessError();
  }

  if (await userHasAnyActiveCredential(user.id)) {
    await writeAudit({
      event: "FIRST_ACCESS_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Usuario ja possui credencial durante verify",
    });
    throw invalidFirstAccessError();
  }

  const invite = await findOpenInviteFirstAccessForUser(user.id);

  if (!invite || isInviteExpired(invite)) {
    if (invite) {
      await softDeleteInvite(invite.id);
    }
    await writeAudit({
      event: "FIRST_ACCESS_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Codigo ausente ou expirado",
    });
    throw invalidFirstAccessError();
  }

  const codeDigits = input.code.replace(/\D/g, "");
  const codeOk = await verifyPassword(codeDigits, invite.codeHash);

  if (!codeOk) {
    const nextAttempts = invite.attempts + 1;
    await incrementInviteAttempts(invite.id, invite.attempts);
    if (nextAttempts >= invite.maxAttempts) {
      await softDeleteInvite(invite.id);
    }

    await writeAudit({
      event: "FIRST_ACCESS_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason:
        nextAttempts >= invite.maxAttempts
          ? "Max tentativas de codigo"
          : "Codigo incorreto",
    });

    throw invalidFirstAccessError();
  }

  const resetToken = generateInviteConfirmToken();
  const resetTokenHash = hashInviteConfirmToken(resetToken);

  await markInviteVerified({
    inviteId: invite.id,
    resetTokenHash,
  });

  await writeAudit({
    event: "FIRST_ACCESS_VERIFIED",
    userId: user.id,
    loginAttempt: input.login,
    loginType: input.loginType,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    requestId: input.requestId,
    reason: "Codigo de primeiro acesso verificado",
  });

  return { resetToken };
};

export const firstAccessConfirm = async (
  input: {
    loginType: AuthLoginType;
    login: string;
    resetToken: string;
    password: string;
    confirmPassword: string;
  } & AuthMeta,
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    registration: string | null;
    onboardingCompleted: boolean;
  };
}> => {
  if (input.password !== input.confirmPassword) {
    throw new UnauthorizedError("Senhas nao conferem", "PASSWORD_MISMATCH");
  }

  const normalized = normalizeLogin(input.loginType, input.login);
  const user = await resolveUserByLoginType(input.loginType, normalized);

  if (!user || user.status !== "ATIVO") {
    await writeAudit({
      event: "FIRST_ACCESS_FAILED",
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Usuario invalido para confirmacao de senha",
    });
    throw invalidFirstAccessError(
      "Nao foi possivel concluir o primeiro acesso",
    );
  }

  if (await userHasAnyActiveCredential(user.id)) {
    await writeAudit({
      event: "FIRST_ACCESS_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Usuario ja possui credencial durante confirm",
    });
    throw invalidFirstAccessError(
      "Nao foi possivel concluir o primeiro acesso",
    );
  }

  const invite = await findVerifiedInviteFirstAccessForUser(user.id);

  if (
    !invite ||
    isInviteConfirmWindowExpired(invite) ||
    !inviteConfirmTokensMatch(input.resetToken, invite.resetTokenHash)
  ) {
    if (invite && isInviteConfirmWindowExpired(invite)) {
      await softDeleteInvite(invite.id);
    }

    await writeAudit({
      event: "FIRST_ACCESS_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: !invite
        ? "Invite verificado ausente"
        : isInviteConfirmWindowExpired(invite)
          ? "Janela de confirmacao expirada"
          : "Reset token invalido",
    });
    throw invalidFirstAccessError(
      "Nao foi possivel concluir o primeiro acesso",
    );
  }

  const emailNormalized = user.userEmail
    ? normalizeEmail(user.userEmail)
    : null;
  const registrationNormalized = user.userRegistration
    ? normalizeCpfCnpj(user.userRegistration)
    : null;

  if (!emailNormalized || !registrationNormalized) {
    await writeAudit({
      event: "FIRST_ACCESS_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Usuario sem e-mail ou CPF/CNPJ cadastrado",
    });
    throw invalidFirstAccessError(
      "Nao foi possivel concluir o primeiro acesso",
    );
  }

  const [existingEmailCred, existingCpfCred] = await Promise.all([
    findActiveCredentialByLoginNormalized("EMAIL", emailNormalized),
    findActiveCredentialByLoginNormalized("CPF/CNPJ", registrationNormalized),
  ]);

  if (existingEmailCred || existingCpfCred) {
    await writeAudit({
      event: "FIRST_ACCESS_FAILED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Credencial ja existente durante confirm",
    });
    throw invalidFirstAccessError(
      "Nao foi possivel concluir o primeiro acesso",
    );
  }

  const passwordHash = await hashPassword(input.password);

  await revokeAllSessionsForUser(user.id, "FIRST_ACCESS_REPLACED");

  const tokens = await db.transaction(async (tx) => {
    await consumeInvite(invite.id, tx);

    await createCredential(
      {
        userId: user.id,
        loginType: "EMAIL",
        login: emailNormalized,
        loginNormalized: emailNormalized,
        password: passwordHash,
      },
      tx,
    );

    await createCredential(
      {
        userId: user.id,
        loginType: "CPF/CNPJ",
        login: registrationNormalized,
        loginNormalized: registrationNormalized,
        password: passwordHash,
      },
      tx,
    );

    if (!invite.memberId) {
      throw new ForbiddenError(
        "Codigo de primeiro acesso sem vinculo de membro",
        "FIRST_ACCESS_INVALID",
      );
    }

    const memberCtx = await findMembershipContextByMemberId(invite.memberId);
    if (!memberCtx) {
      throw new ForbiddenError(
        "Vinculo com empresa invalido",
        "ENTERPRISE_FORBIDDEN",
      );
    }

    return issueSessionTokens(
      {
        userId: user.id,
        enterpriseId: memberCtx.enterpriseId,
        memberId: memberCtx.memberId,
        userAgent: input.userAgent,
        ipAddress: input.ipAddress,
      },
      tx,
    );
  });

  await writeAudit({
    event: "FIRST_ACCESS_COMPLETED",
    userId: user.id,
    loginAttempt: input.login,
    loginType: input.loginType,
    sessionId: tokens.sessionId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    requestId: input.requestId,
    reason: "Primeiro acesso concluido com sucesso",
  });

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: {
      id: user.id,
      name: user.userName,
      email: user.userEmail ?? null,
      registration: user.userRegistration ?? null,
      onboardingCompleted: user.onboardingCompleted,
    },
  };
};

export const firstAccessResend = async (
  input: {
    loginType: AuthLoginType;
    login: string;
  } & AuthMeta,
): Promise<{ ok: true }> => firstAccessLookup(input);
