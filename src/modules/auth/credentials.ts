import {
  ForbiddenError,
  UnauthorizedError,
} from "../../shared/errors/app-error.js";
import { writeAudit } from "./audit.js";
import {
  assertNotLocked,
  registerFailure,
  resetFailures,
} from "./lock.js";
import { type AuthLoginType, normalizeLogin, verifyPassword } from "./password.js";
import {
  findCredentialByLogin,
  type CredentialWithUser,
} from "./repository.js";

type AuthMeta = {
  login: string;
  loginType: AuthLoginType;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
};

export const verifyLoginCredentials = async (
  input: {
    loginType: AuthLoginType;
    login: string;
    password: string;
  } & AuthMeta,
): Promise<CredentialWithUser> => {
  const loginNormalized = normalizeLogin(input.loginType, input.login);

  const found = await findCredentialByLogin(input.loginType, loginNormalized);

  if (!found) {
    await writeAudit({
      event: "LOGIN_FAILED_USER",
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Credencial inexistente",
    });
    throw new UnauthorizedError(
      "Credenciais invalidas",
      "INVALID_CREDENTIALS",
    );
  }

  const { credential, user } = found;

  try {
    assertNotLocked({
      id: credential.id,
      failedAttempts: credential.failedAttempts,
      lockedUntil: credential.lockedUntil,
    });
  } catch (error) {
    await writeAudit({
      event: "LOGIN_BLOCKED",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Conta bloqueada",
    });
    throw error;
  }

  if (user.status !== "ATIVO" || credential.status !== "ATIVO") {
    await writeAudit({
      event: "LOGIN_FAILED_PASSWORD",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: `Status invalido (user=${user.status}, credential=${credential.status})`,
    });
    throw new ForbiddenError(
      "Usuario inativo ou bloqueado",
      "USER_INACTIVE",
    );
  }

  const passwordOk = await verifyPassword(input.password, credential.password);

  if (!passwordOk) {
    await registerFailure(credential.id, credential.failedAttempts);
    await writeAudit({
      event: "LOGIN_FAILED_PASSWORD",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Senha incorreta",
    });
    throw new UnauthorizedError(
      "Credenciais invalidas",
      "INVALID_CREDENTIALS",
    );
  }

  await resetFailures(credential.id);

  return { credential, user };
};
