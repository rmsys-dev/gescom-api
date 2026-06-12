import { and, count, eq, gt, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import {
  enterprises,
  enterprisesMembers,
  membersDepartments,
  userSessions,
  users,
  usersCredentials,
} from "../../db/schema.js";
import {
  activeUserMembershipWhere,
  isActiveEnterprise,
} from "../../shared/db/tenant-predicates.js";
import { type AuthLoginType, toDbLoginType } from "./password.js";

export type DbExecutor =
  | typeof db
  | Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CredentialWithUser = {
  credential: typeof usersCredentials.$inferSelect;
  user: typeof users.$inferSelect;
};

export const findCredentialByLogin = async (
  loginType: AuthLoginType,
  loginNormalized: string,
): Promise<CredentialWithUser | null> => {
  
  const rows = await db
    .select({
      credential: usersCredentials,
      user: users,
    })
    .from(usersCredentials)
    .innerJoin(users, eq(users.id, usersCredentials.userId))
    .where(
      and(
        eq(usersCredentials.loginType, toDbLoginType(loginType)),
        eq(usersCredentials.loginNormalized, loginNormalized),
        isNull(usersCredentials.deletedAt),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);
  
  return rows[0] ?? null;
};

export type UserEnterpriseMembership = {
  memberId: string;
  enterpriseId: string;
  enterpriseRegistration: string;
  enterpriseTradeName: string;
  enterpriseLegalName: string;
  enterpriseStatus: typeof enterprises.$inferSelect.status;
  class: typeof enterprisesMembers.$inferSelect.class;
  memberDepartmentId: string | null;
};

export const listActiveEnterprisesForUser = async (
  userId: string,
  pagination?: { limit: number; offset: number },
): Promise<UserEnterpriseMembership[]> => {
  const rows = await db.query.enterprisesMembers.findMany({
    where: activeUserMembershipWhere(userId),
    with: {
      enterprise: true,
      departments: {
        where: and(
          eq(membersDepartments.mainDepartment, true),
          eq(membersDepartments.status, "ATIVO"),
          isNull(membersDepartments.deletedAt),
        ),
      },
    },
  });

  const activeRows = rows
    .filter((row) => isActiveEnterprise(row.enterprise))
    .sort((left, right) => {
      const byTradeName = (left.enterprise?.tradeName ?? "").localeCompare(
        right.enterprise?.tradeName ?? "",
      );
      if (byTradeName !== 0) {
        return byTradeName;
      }
      return (left.enterprise?.id ?? "").localeCompare(right.enterprise?.id ?? "");
    });

  const page = pagination
    ? activeRows.slice(pagination.offset, pagination.offset + pagination.limit)
    : activeRows;

  return page.map((row) => ({
    memberId: row.id,
    enterpriseId: row.enterprise!.id,
    enterpriseRegistration: row.enterprise!.registration,
    enterpriseTradeName: row.enterprise!.tradeName,
    enterpriseLegalName: row.enterprise!.legalName,
    enterpriseStatus: row.enterprise!.status,
    class: row.class,
    memberDepartmentId: row.departments[0]?.id ?? null,
  }));
};

export type MembershipContext = {
  memberId: string;
  enterpriseId: string;
  memberDepartmentId: string | null;
};

export const findMembershipContext = async (
  userId: string,
  enterpriseId: string,
): Promise<MembershipContext | null> => {
  const memberRow = await db
    .select({
      memberId: enterprisesMembers.id,
      memberDepartmentId: membersDepartments.id,
    })
    .from(enterprisesMembers)
    .innerJoin(enterprises, eq(enterprises.id, enterprisesMembers.enterpriseId))
    .leftJoin(
      membersDepartments,
      and(
        eq(membersDepartments.memberId, enterprisesMembers.id),
        eq(membersDepartments.mainDepartment, true),
        eq(membersDepartments.status, "ATIVO"),
        isNull(membersDepartments.deletedAt),
      ),
    )
    .where(
      and(
        eq(enterprisesMembers.userId, userId),
        eq(enterprisesMembers.enterpriseId, enterpriseId),
        eq(enterprisesMembers.status, "ATIVO"),
        isNull(enterprisesMembers.deletedAt),
        eq(enterprises.status, "ATIVO"),
        isNull(enterprises.deletedAt),
      ),
    )
    .limit(1);

  const member = memberRow[0];
  if (!member) {
    return null;
  }

  return {
    memberId: member.memberId,
    enterpriseId,
    memberDepartmentId: member.memberDepartmentId ?? null,
  };
};

/**
 * Confirma na BD que o membro da sessão é o vínculo ativo do utilizador com a empresa indicada
 * (anti cross-tenant / vínculo revogado após emissão do token).
 */
export const assertActiveMemberEnterpriseLink = async (input: {
  userId: string;
  memberId: string;
  enterpriseId: string;
}): Promise<boolean> => {
  const ctx = await findMembershipContext(input.userId, input.enterpriseId);
  return ctx !== null && ctx.memberId === input.memberId;
};

/** Departamento principal (`mainDepartment`) do membro, se existir. */
export const findPrimaryMemberDepartmentIdByMemberId = async (
  memberId: string,
): Promise<string | null> => {
  const rows = await db
    .select({ id: membersDepartments.id })
    .from(membersDepartments)
    .where(
      and(
        eq(membersDepartments.memberId, memberId),
        eq(membersDepartments.mainDepartment, true),
        eq(membersDepartments.status, "ATIVO"),
        isNull(membersDepartments.deletedAt),
      ),
    )
    .limit(1);
  return rows[0]?.id ?? null;
};

export type SessionRow = typeof userSessions.$inferSelect;

export const createSession = async (
  input: {
    userId: string;
    memberId?: string | null;
    jti: string;
    refreshTokenHash: string;
    userAgent: string | null;
    ipAddress: string | null;
    expiresAt: Date;
  },
  executor: DbExecutor = db,
): Promise<SessionRow> => {
  const [row] = await executor
    .insert(userSessions)
    .values({
      userId: input.userId,
      memberId: input.memberId ?? null,
      jti: input.jti,
      refreshTokenHash: input.refreshTokenHash,
      userAgent: input.userAgent,
      ipAddress: input.ipAddress,
      expiresAt: input.expiresAt,
    })
    .returning();
  return row;
};

export const findMembershipContextByMemberId = async (
  memberId: string,
): Promise<MembershipContext | null> => {
  const memberRow = await db
    .select({
      memberId: enterprisesMembers.id,
      enterpriseId: enterprisesMembers.enterpriseId,
      memberDepartmentId: membersDepartments.id,
    })
    .from(enterprisesMembers)
    .innerJoin(enterprises, eq(enterprises.id, enterprisesMembers.enterpriseId))
    .leftJoin(
      membersDepartments,
      and(
        eq(membersDepartments.memberId, enterprisesMembers.id),
        eq(membersDepartments.mainDepartment, true),
        eq(membersDepartments.status, "ATIVO"),
        isNull(membersDepartments.deletedAt),
      ),
    )
    .where(
      and(
        eq(enterprisesMembers.id, memberId),
        eq(enterprisesMembers.status, "ATIVO"),
        isNull(enterprisesMembers.deletedAt),
        eq(enterprises.status, "ATIVO"),
        isNull(enterprises.deletedAt),
      ),
    )
    .limit(1);

  const member = memberRow[0];
  if (!member) {
    return null;
  }

  return {
    memberId: member.memberId,
    enterpriseId: member.enterpriseId,
    memberDepartmentId: member.memberDepartmentId ?? null,
  };
};

export const findMembershipContextByMemberIdForUser = async (
  memberId: string,
  userId: string,
): Promise<MembershipContext | null> => {
  const memberRow = await db
    .select({
      memberId: enterprisesMembers.id,
      enterpriseId: enterprisesMembers.enterpriseId,
      memberDepartmentId: membersDepartments.id,
    })
    .from(enterprisesMembers)
    .innerJoin(enterprises, eq(enterprises.id, enterprisesMembers.enterpriseId))
    .leftJoin(
      membersDepartments,
      and(
        eq(membersDepartments.memberId, enterprisesMembers.id),
        eq(membersDepartments.mainDepartment, true),
        eq(membersDepartments.status, "ATIVO"),
        isNull(membersDepartments.deletedAt),
      ),
    )
    .where(
      and(
        eq(enterprisesMembers.id, memberId),
        eq(enterprisesMembers.userId, userId),
        eq(enterprisesMembers.status, "ATIVO"),
        isNull(enterprisesMembers.deletedAt),
        eq(enterprises.status, "ATIVO"),
        isNull(enterprises.deletedAt),
      ),
    )
    .limit(1);

  const member = memberRow[0];
  if (!member) {
    return null;
  }

  return {
    memberId: member.memberId,
    enterpriseId: member.enterpriseId,
    memberDepartmentId: member.memberDepartmentId ?? null,
  };
};

export const findSessionById = async (
  sessionId: string,
): Promise<SessionRow | null> => {
  const rows = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.id, sessionId))
    .limit(1);
  return rows[0] ?? null;
};

export const findActiveSessionByJti = async (
  jti: string,
): Promise<SessionRow | null> => {
  const rows = await db
    .select()
    .from(userSessions)
    .where(
      and(
        eq(userSessions.jti, jti),
        isNull(userSessions.revokedAt),
        gt(userSessions.expiresAt, new Date()),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
};

export const findAnySessionByJti = async (
  jti: string,
): Promise<SessionRow | null> => {
  const rows = await db
    .select()
    .from(userSessions)
    .where(eq(userSessions.jti, jti))
    .limit(1);
  return rows[0] ?? null;
};

export const revokeSession = async (
  sessionId: string,
  reason: string,
  replacedBySessionId?: string,
): Promise<void> => {
  const now = new Date();
  await db
    .update(userSessions)
    .set({
      revokedAt: now,
      revokedReason: reason,
      replacedBySessionId: replacedBySessionId ?? null,
      updatedAt: now,
    })
    .where(eq(userSessions.id, sessionId));
};

export const revokeAllSessionsForUser = async (
  userId: string,
  reason: string,
  executor: DbExecutor = db,
): Promise<void> => {
  const now = new Date();
  await executor
    .update(userSessions)
    .set({
      revokedAt: now,
      revokedReason: reason,
      updatedAt: now,
    })
    .where(
      and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)),
    );
};

export const findUserById = async (
  userId: string,
): Promise<typeof users.$inferSelect | null> => {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
};

export const findEnterpriseById = async (
  enterpriseId: string,
): Promise<typeof enterprises.$inferSelect | null> => {
  const rows = await db
    .select()
    .from(enterprises)
    .where(and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
};

export const findUserByRegistration = async (
  registration: string,
): Promise<typeof users.$inferSelect | null> => {
  const rows = await db
    .select()
    .from(users)
    .where(
      and(eq(users.userRegistration, registration), isNull(users.deletedAt)),
    )
    .limit(1);
  return rows[0] ?? null;
};

export const findUserByEmail = async (
  email: string,
): Promise<typeof users.$inferSelect | null> => {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.userEmail, email), isNull(users.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
};

export const findUserByPhone = async (
  phone: string,
): Promise<typeof users.$inferSelect | null> => {
  const rows = await db
    .select()
    .from(users)
    .where(and(eq(users.userPhone, phone), isNull(users.deletedAt)))
    .limit(1);
  return rows[0] ?? null;
};

export const findActiveCredentialByLoginNormalized = async (
  loginType: AuthLoginType,
  loginNormalized: string,
): Promise<typeof usersCredentials.$inferSelect | null> => {
  const rows = await db
    .select()
    .from(usersCredentials)
    .where(
      and(
        eq(usersCredentials.loginType, toDbLoginType(loginType)),
        eq(usersCredentials.loginNormalized, loginNormalized),
        isNull(usersCredentials.deletedAt),
      ),
    )
    .limit(1);
  return rows[0] ?? null;
};

export const createUser = async (
  input: {
    userName: string;
    userRegistration: string;
    userEmail: string;
    userPhone: string;
  },
  executor: DbExecutor = db,
): Promise<typeof users.$inferSelect> => {
  const [row] = await executor
    .insert(users)
    .values({
      userName: input.userName,
      userRegistration: input.userRegistration,
      userEmail: input.userEmail,
      userPhone: input.userPhone,
    })
    .returning();
  return row;
};

export type UserPatchColumns = {
  userName?: string;
  userRegistration?: string;
  userEmail?: string;
  userPhone?: string;
};

export const updateUserById = async (
  userId: string,
  patch: UserPatchColumns,
  executor: DbExecutor = db,
): Promise<typeof users.$inferSelect | null> => {
  const now = new Date();
  const setPayload: {
    updatedAt: Date;
    userName?: string;
    userRegistration?: string;
    userEmail?: string;
    userPhone?: string;
  } = { updatedAt: now };
  if (patch.userName !== undefined) {
    setPayload.userName = patch.userName;
  }
  if (patch.userRegistration !== undefined) {
    setPayload.userRegistration = patch.userRegistration;
  }
  if (patch.userEmail !== undefined) {
    setPayload.userEmail = patch.userEmail;
  }
  if (patch.userPhone !== undefined) {
    setPayload.userPhone = patch.userPhone;
  }

  const [row] = await executor
    .update(users)
    .set(setPayload)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)))
    .returning();
  return row ?? null;
};

export const findActiveCredentialsByUserId = async (
  userId: string,
  executor: DbExecutor = db,
): Promise<Array<typeof usersCredentials.$inferSelect>> => {
  return executor
    .select()
    .from(usersCredentials)
    .where(
      and(
        eq(usersCredentials.userId, userId),
        eq(usersCredentials.status, "ATIVO"),
        isNull(usersCredentials.deletedAt),
      ),
    );
};

export const updateCredentialLogin = async (
  credentialId: string,
  input: { login: string; loginNormalized: string },
  executor: DbExecutor = db,
): Promise<void> => {
  const now = new Date();
  await executor
    .update(usersCredentials)
    .set({
      login: input.login,
      loginNormalized: input.loginNormalized,
      updatedAt: now,
    })
    .where(
      and(
        eq(usersCredentials.id, credentialId),
        isNull(usersCredentials.deletedAt),
      ),
    );
};

export const updateActiveCredentialsPasswordForUser = async (
  userId: string,
  password: string,
  executor: DbExecutor = db,
): Promise<void> => {
  const now = new Date();
  await executor
    .update(usersCredentials)
    .set({
      password,
      passwordUpdatedAt: now,
      failedAttempts: 0,
      lockedUntil: null,
      lastFailedAt: null,
      updatedAt: now,
    })
    .where(
      and(
        eq(usersCredentials.userId, userId),
        eq(usersCredentials.status, "ATIVO"),
        isNull(usersCredentials.deletedAt),
      ),
    );
};

export const createCredential = async (
  input: {
    userId: string;
    loginType: AuthLoginType;
    login: string;
    loginNormalized: string;
    password: string;
  },
  executor: DbExecutor = db,
): Promise<typeof usersCredentials.$inferSelect> => {
  const [row] = await executor
    .insert(usersCredentials)
    .values({
      userId: input.userId,
      loginType: toDbLoginType(input.loginType),
      login: input.login,
      loginNormalized: input.loginNormalized,
      password: input.password,
    })
    .returning();
  return row;
};
