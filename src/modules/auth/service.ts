import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import {
  enterprisesMembers,
  membersDepartments,
  users,
} from "../../db/schema.js";
import {
  activeMembershipForEnterprise,
  isActiveEnterprise,
} from "../../shared/db/tenant-predicates.js";
import {
  ForbiddenError,
  UnauthorizedError,
} from "../../shared/errors/app-error.js";
import { writeAudit } from "./audit.js";
import { verifyLoginCredentials } from "./credentials.js";
import { mapAuthUser, mapEnterprises } from "./enterprise-map.js";
import { listAllowed, resolvePermissionsBatch } from "./permissions.js";
import {
  findActiveSessionByJti,
  findAnySessionByJti,
  findEnterpriseById,
  findMembershipContext,
  findMembershipContextByMemberIdForUser,
  findSessionById,
  findUserById,
  listActiveEnterprisesForUser,
  revokeAllSessionsForUser,
  revokeSession,
  type UserEnterpriseMembership,
} from "./repository.js";
import { verifyRefreshToken, hashRefreshToken } from "./tokens.js";
import { issueSessionTokens } from "./session-tokens.js";
import type { AuthLoginType } from "./password.js";

type AuthMeta = {
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
};

type LoginInput = {
  loginType: AuthLoginType;
  login: string;
  password: string;
} & AuthMeta;

type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    name: string;
    email: string | null;
    registration: string;
    onboardingCompleted: boolean;
  };
  enterprises: Array<{
    id: string;
    registration: string;
    tradeName: string;
    legalName: string;
    memberId: string;
    class: UserEnterpriseMembership["class"];
  }>;
};

type RefreshInput = { refreshToken: string } & AuthMeta;

type RefreshResponse = {
  accessToken: string;
  refreshToken: string;
};

type SwitchEnterpriseInput = {
  userId: string;
  sessionId: string;
  enterpriseId: string;
} & AuthMeta;

type MeResponseDepartment = {
  memberDepartmentId: string;
  departmentId: string;
  name: string;
  mainDepartment: boolean;
  permissions: string[];
};

type MeResponse = {
  user: {
    id: string;
    name: string;
    email: string | null;
    registration: string;
    phone: string | null;
    onboardingCompleted: boolean;
  };
  enterprise: {
    id: string;
    tradeName: string;
    legalName: string;
    memberId: string;
    memberDepartmentId: string | null;
  } | null;
  /** Departamentos activos do membro na empresa; permissões efectivas (ALLOW) por vínculo. */
  departments: MeResponseDepartment[];
};

export class AuthService {
  public async login(input: LoginInput): Promise<LoginResponse> {
    const { user } = await verifyLoginCredentials({
      loginType: input.loginType,
      login: input.login,
      password: input.password,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
    });

    const memberships = await listActiveEnterprisesForUser(user.id);
    if (memberships.length === 0) {
      throw new ForbiddenError(
        "Usuario nao possui vinculo ativo com empresa",
        "ENTERPRISE_FORBIDDEN",
      );
    }

    await revokeAllSessionsForUser(user.id, "LOGIN_REPLACED");

    const selectedMembership = memberships[0];

    const tokens = await issueSessionTokens({
      userId: user.id,
      enterpriseId: selectedMembership.enterpriseId,
      memberId: selectedMembership.memberId,
      memberDepartmentId: selectedMembership.memberDepartmentId,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    await writeAudit({
      event: "LOGIN_SUCCESS",
      userId: user.id,
      loginAttempt: input.login,
      loginType: input.loginType,
      sessionId: tokens.sessionId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      user: mapAuthUser(user),
      enterprises: mapEnterprises(memberships),
    };
  }

  public async refresh(input: RefreshInput): Promise<RefreshResponse> {
    const claims = verifyRefreshToken(input.refreshToken);

    const sessionByJti = await findActiveSessionByJti(claims.jti);

    if (!sessionByJti) {
      const reused = await findAnySessionByJti(claims.jti);
      if (reused) {
        await revokeAllSessionsForUser(reused.userId, "REFRESH_REUSE");
        await writeAudit({
          event: "REFRESH_REUSE",
          userId: reused.userId,
          sessionId: reused.id,
          ipAddress: input.ipAddress,
          userAgent: input.userAgent,
          requestId: input.requestId,
          reason: "Refresh token ja revogado reutilizado",
        });
      }
      throw new UnauthorizedError(
        "Refresh token invalido",
        "INVALID_REFRESH_TOKEN",
      );
    }

    if (sessionByJti.id !== claims.sid) {
      await revokeAllSessionsForUser(sessionByJti.userId, "REFRESH_REUSE");
      throw new UnauthorizedError(
        "Refresh token invalido",
        "INVALID_REFRESH_TOKEN",
      );
    }

    const incomingHash = hashRefreshToken(input.refreshToken);
    if (incomingHash !== sessionByJti.refreshTokenHash) {
      await revokeAllSessionsForUser(sessionByJti.userId, "REFRESH_REUSE");
      await writeAudit({
        event: "REFRESH_REUSE",
        userId: sessionByJti.userId,
        sessionId: sessionByJti.id,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        requestId: input.requestId,
        reason: "Hash do refresh divergente",
      });
      throw new UnauthorizedError(
        "Refresh token invalido",
        "INVALID_REFRESH_TOKEN",
      );
    }

    const user = await findUserById(sessionByJti.userId);
    if (!user || user.status !== "ATIVO") {
      await revokeSession(sessionByJti.id, "USER_INACTIVE");
      throw new ForbiddenError(
        "Usuario inativo ou bloqueado",
        "USER_INACTIVE",
      );
    }

    let memberDepartmentId: string | null = null;
    let memberId: string | null = null;
    let enterpriseId: string | null = claims.ent ?? null;

    if (enterpriseId) {
      const ctx = await findMembershipContext(
        sessionByJti.userId,
        enterpriseId,
      );
      if (!ctx) {
        await revokeSession(sessionByJti.id, "ENTERPRISE_INVALID");
        throw new ForbiddenError(
          "Vinculo com empresa invalido",
          "ENTERPRISE_FORBIDDEN",
        );
      }
      memberId = ctx.memberId;
      memberDepartmentId = ctx.memberDepartmentId;
    } else if (sessionByJti.memberId) {
      const ctx = await findMembershipContextByMemberIdForUser(
        sessionByJti.memberId,
        sessionByJti.userId,
      );
      if (!ctx) {
        await revokeSession(sessionByJti.id, "ENTERPRISE_INVALID");
        throw new ForbiddenError(
          "Vinculo com empresa invalido",
          "ENTERPRISE_FORBIDDEN",
        );
      }
      enterpriseId = ctx.enterpriseId;
      memberId = ctx.memberId;
      memberDepartmentId = ctx.memberDepartmentId;
    } else {
      await revokeSession(sessionByJti.id, "INVALID_SESSION");
      throw new UnauthorizedError("Sessao invalida", "INVALID_SESSION");
    }

    const tokens = await issueSessionTokens({
      userId: sessionByJti.userId,
      enterpriseId,
      memberId,
      memberDepartmentId,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    await revokeSession(sessionByJti.id, "ROTATED", tokens.sessionId);

    await writeAudit({
      event: "REFRESH",
      userId: sessionByJti.userId,
      sessionId: tokens.sessionId,
      enterpriseId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  public async logout(
    input: { sessionId: string; userId: string } & AuthMeta,
  ): Promise<void> {
    await revokeSession(input.sessionId, "LOGOUT");
    await writeAudit({
      event: "LOGOUT",
      userId: input.userId,
      sessionId: input.sessionId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
    });
  }

  public async switchEnterprise(input: SwitchEnterpriseInput) {
    const ctx = await findMembershipContext(input.userId, input.enterpriseId);
    if (!ctx) {
      await writeAudit({
        event: "PERMISSION_DENIED",
        userId: input.userId,
        sessionId: input.sessionId,
        enterpriseId: input.enterpriseId,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        requestId: input.requestId,
        reason: "Vinculo com empresa nao encontrado ou inativo",
      });
      throw new ForbiddenError(
        "Vinculo com empresa invalido",
        "ENTERPRISE_FORBIDDEN",
      );
    }

    const session = await findSessionById(input.sessionId);
    if (!session || session.revokedAt) {
      throw new UnauthorizedError("Sessao invalida", "INVALID_SESSION");
    }

    const tokens = await issueSessionTokens({
      userId: input.userId,
      enterpriseId: input.enterpriseId,
      memberId: ctx.memberId,
      memberDepartmentId: ctx.memberDepartmentId,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
    });

    await revokeSession(input.sessionId, "SWITCHED", tokens.sessionId);

    await writeAudit({
      event: "SWITCH_ENTERPRISE",
      userId: input.userId,
      sessionId: tokens.sessionId,
      enterpriseId: input.enterpriseId,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      enterprise: {
        id: input.enterpriseId,
        memberId: ctx.memberId,
        memberDepartmentId: ctx.memberDepartmentId,
      },
    };
  }

  public async me(input: {
    userId: string;
    enterpriseId?: string;
    memberDepartmentId?: string;
  }): Promise<MeResponse> {
    if (!input.enterpriseId) {
      const user = await db.query.users.findFirst({
        where: and(eq(users.id, input.userId), isNull(users.deletedAt)),
      });
      if (!user) {
        throw new UnauthorizedError("Usuario nao encontrado", "USER_NOT_FOUND");
      }

      return {
        user: {
          id: user.id,
          name: user.userName,
          email: user.userEmail ?? null,
          registration: user.userRegistration,
          phone: user.userPhone ?? null,
          onboardingCompleted: user.onboardingCompleted,
        },
        enterprise: null,
        departments: [],
      };
    }

    const row = await db.query.users.findFirst({
      where: and(eq(users.id, input.userId), isNull(users.deletedAt)),
      with: {
        memberships: {
          where: activeMembershipForEnterprise(input.enterpriseId),
          with: {
            enterprise: true,
            departments: {
              where: and(
                eq(membersDepartments.status, "ATIVO"),
                isNull(membersDepartments.deletedAt),
              ),
              with: {
                department: true,
              },
            },
          },
        },
      },
    });

    if (!row) {
      throw new UnauthorizedError("Usuario nao encontrado", "USER_NOT_FOUND");
    }

    const membership = row.memberships.find((item) =>
      isActiveEnterprise(item.enterprise),
    );

    let enterpriseInfo: MeResponse["enterprise"] = null;
    let departments: MeResponse["departments"] = [];

    if (membership?.enterprise) {
      const mainDepartment =
        membership.departments.find((item) => item.mainDepartment) ??
        membership.departments[0];

      enterpriseInfo = {
        id: membership.enterprise.id,
        tradeName: membership.enterprise.tradeName,
        legalName: membership.enterprise.legalName,
        memberId: membership.id,
        memberDepartmentId: mainDepartment?.id ?? null,
      };

      const memberDeptRows = membership.departments
        .filter(
          (item) =>
            item.department != null && item.department.deletedAt == null,
        )
        .sort((left, right) => {
          if (left.mainDepartment !== right.mainDepartment) {
            return left.mainDepartment ? -1 : 1;
          }
          return (left.department?.name ?? "").localeCompare(
            right.department?.name ?? "",
          );
        });

      if (memberDeptRows.length > 0) {
        const permissionsByMemberDepartment = await resolvePermissionsBatch(
          memberDeptRows.map((item) => item.id),
        );

        departments = memberDeptRows.map((item) => ({
          memberDepartmentId: item.id,
          departmentId: item.departmentId,
          name: item.department!.name,
          mainDepartment: item.mainDepartment,
          permissions: listAllowed(
            permissionsByMemberDepartment.get(item.id) ?? new Map(),
          ),
        }));
      }
    }

    return {
      user: {
        id: row.id,
        name: row.userName,
        email: row.userEmail ?? null,
        registration: row.userRegistration,
        phone: row.userPhone ?? null,
        onboardingCompleted: row.onboardingCompleted,
      },
      enterprise: enterpriseInfo,
      departments,
    };
  }
}

export const authService = new AuthService();
