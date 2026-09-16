import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import { enterprises, enterprisesMembers, userSessions, users, usersCredentials, } from "../../db/schema.js";
import { activeUserMembershipWhere, isActiveEnterprise, } from "../../shared/db/tenant-predicates.js";
import { invalidateAuthSession, invalidateAuthSessions, } from "../../shared/cache/auth-cache-invalidation.js";
import { toDbLoginType } from "./password.js";
export const findCredentialByLogin = async (loginType, loginNormalized) => {
    const rows = await db
        .select({
        credential: usersCredentials,
        user: users,
    })
        .from(usersCredentials)
        .innerJoin(users, eq(users.id, usersCredentials.userId))
        .where(and(eq(usersCredentials.loginType, toDbLoginType(loginType)), eq(usersCredentials.loginNormalized, loginNormalized), isNull(usersCredentials.deletedAt), isNull(users.deletedAt)))
        .limit(1);
    return rows[0] ?? null;
};
export const listActiveEnterprisesForUser = async (userId, pagination) => {
    const rows = await db.query.enterprisesMembers.findMany({
        where: activeUserMembershipWhere(userId),
        with: {
            enterprise: true,
        },
    });
    const activeRows = rows
        .filter((row) => isActiveEnterprise(row.enterprise))
        .sort((left, right) => {
        const byTradeName = (left.enterprise?.tradeName ?? "").localeCompare(right.enterprise?.tradeName ?? "");
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
        enterpriseId: row.enterprise.id,
        enterpriseRegistration: row.enterprise.registration,
        enterpriseTradeName: row.enterprise.tradeName,
        enterpriseLegalName: row.enterprise.legalName,
        enterpriseStatus: row.enterprise.status,
        class: row.class,
    }));
};
export const findMembershipContext = async (userId, enterpriseId) => {
    const memberRow = await db
        .select({
        memberId: enterprisesMembers.id,
    })
        .from(enterprisesMembers)
        .innerJoin(enterprises, eq(enterprises.id, enterprisesMembers.enterpriseId))
        .where(and(eq(enterprisesMembers.userId, userId), eq(enterprisesMembers.enterpriseId, enterpriseId), eq(enterprisesMembers.status, "ATIVO"), isNull(enterprisesMembers.deletedAt), eq(enterprises.status, "ATIVO"), isNull(enterprises.deletedAt)))
        .limit(1);
    const member = memberRow[0];
    if (!member) {
        return null;
    }
    return {
        memberId: member.memberId,
        enterpriseId,
    };
};
/**
 * Confirma na BD que o membro da sessão é o vínculo ativo do utilizador com a empresa indicada
 * (anti cross-tenant / vínculo revogado após emissão do token).
 */
export const assertActiveMemberEnterpriseLink = async (input) => {
    const ctx = await findMembershipContext(input.userId, input.enterpriseId);
    return ctx !== null && ctx.memberId === input.memberId;
};
export const createSession = async (input, executor = db) => {
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
export const findMembershipContextByMemberId = async (memberId) => {
    const memberRow = await db
        .select({
        memberId: enterprisesMembers.id,
        enterpriseId: enterprisesMembers.enterpriseId,
    })
        .from(enterprisesMembers)
        .innerJoin(enterprises, eq(enterprises.id, enterprisesMembers.enterpriseId))
        .where(and(eq(enterprisesMembers.id, memberId), eq(enterprisesMembers.status, "ATIVO"), isNull(enterprisesMembers.deletedAt), eq(enterprises.status, "ATIVO"), isNull(enterprises.deletedAt)))
        .limit(1);
    const member = memberRow[0];
    if (!member) {
        return null;
    }
    return {
        memberId: member.memberId,
        enterpriseId: member.enterpriseId,
    };
};
export const findMembershipContextByMemberIdForUser = async (memberId, userId) => {
    const memberRow = await db
        .select({
        memberId: enterprisesMembers.id,
        enterpriseId: enterprisesMembers.enterpriseId,
    })
        .from(enterprisesMembers)
        .innerJoin(enterprises, eq(enterprises.id, enterprisesMembers.enterpriseId))
        .where(and(eq(enterprisesMembers.id, memberId), eq(enterprisesMembers.userId, userId), eq(enterprisesMembers.status, "ATIVO"), isNull(enterprisesMembers.deletedAt), eq(enterprises.status, "ATIVO"), isNull(enterprises.deletedAt)))
        .limit(1);
    const member = memberRow[0];
    if (!member) {
        return null;
    }
    return {
        memberId: member.memberId,
        enterpriseId: member.enterpriseId,
    };
};
export const findSessionById = async (sessionId) => {
    const rows = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.id, sessionId))
        .limit(1);
    return rows[0] ?? null;
};
export const findActiveSessionByJti = async (jti) => {
    const rows = await db
        .select()
        .from(userSessions)
        .where(and(eq(userSessions.jti, jti), isNull(userSessions.revokedAt), gt(userSessions.expiresAt, new Date())))
        .limit(1);
    return rows[0] ?? null;
};
export const findAnySessionByJti = async (jti) => {
    const rows = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.jti, jti))
        .limit(1);
    return rows[0] ?? null;
};
export const revokeSession = async (sessionId, reason, replacedBySessionId) => {
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
    invalidateAuthSession(sessionId);
};
export const revokeAllSessionsForUser = async (userId, reason, executor = db) => {
    const activeSessions = await executor
        .select({ id: userSessions.id })
        .from(userSessions)
        .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
    const now = new Date();
    await executor
        .update(userSessions)
        .set({
        revokedAt: now,
        revokedReason: reason,
        updatedAt: now,
    })
        .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt)));
    invalidateAuthSessions(activeSessions.map((session) => session.id));
};
/**
 * Revoga sessões ativas do utilizador com o mesmo par ipAddress + userAgent.
 * Usado no login para substituir a sessão do mesmo cliente sem derrubar outros dispositivos.
 */
export const revokeMatchingClientSessionsForUser = async (userId, ipAddress, userAgent, reason, executor = db) => {
    if (ipAddress === null || userAgent === null) {
        return;
    }
    const matchingSessions = await executor
        .select({ id: userSessions.id })
        .from(userSessions)
        .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt), eq(userSessions.ipAddress, ipAddress), eq(userSessions.userAgent, userAgent)));
    const now = new Date();
    await executor
        .update(userSessions)
        .set({
        revokedAt: now,
        revokedReason: reason,
        updatedAt: now,
    })
        .where(and(eq(userSessions.userId, userId), isNull(userSessions.revokedAt), eq(userSessions.ipAddress, ipAddress), eq(userSessions.userAgent, userAgent)));
    invalidateAuthSessions(matchingSessions.map((session) => session.id));
};
export const findUserById = async (userId) => {
    const rows = await db
        .select()
        .from(users)
        .where(and(eq(users.id, userId), isNull(users.deletedAt)))
        .limit(1);
    return rows[0] ?? null;
};
export const findEnterpriseById = async (enterpriseId) => {
    const rows = await db
        .select()
        .from(enterprises)
        .where(and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)))
        .limit(1);
    return rows[0] ?? null;
};
export const findUserByRegistration = async (registration) => {
    const rows = await db
        .select()
        .from(users)
        .where(and(eq(users.userRegistration, registration), isNull(users.deletedAt)))
        .limit(1);
    return rows[0] ?? null;
};
export const findUserByEmail = async (email) => {
    const rows = await db
        .select()
        .from(users)
        .where(and(eq(users.userEmail, email), isNull(users.deletedAt)))
        .limit(1);
    return rows[0] ?? null;
};
export const findUserByPhone = async (phone) => {
    const rows = await db
        .select()
        .from(users)
        .where(and(eq(users.userPhone, phone), isNull(users.deletedAt)))
        .limit(1);
    return rows[0] ?? null;
};
export const findActiveCredentialByLoginNormalized = async (loginType, loginNormalized) => {
    const rows = await db
        .select()
        .from(usersCredentials)
        .where(and(eq(usersCredentials.loginType, toDbLoginType(loginType)), eq(usersCredentials.loginNormalized, loginNormalized), isNull(usersCredentials.deletedAt)))
        .limit(1);
    return rows[0] ?? null;
};
export const createUser = async (input, executor = db) => {
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
export const updateUserById = async (userId, patch, executor = db) => {
    const now = new Date();
    const setPayload = { updatedAt: now };
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
export const findActiveCredentialsByUserId = async (userId, executor = db) => {
    return executor
        .select()
        .from(usersCredentials)
        .where(and(eq(usersCredentials.userId, userId), eq(usersCredentials.status, "ATIVO"), isNull(usersCredentials.deletedAt)));
};
export const updateCredentialLogin = async (credentialId, input, executor = db) => {
    const now = new Date();
    await executor
        .update(usersCredentials)
        .set({
        login: input.login,
        loginNormalized: input.loginNormalized,
        updatedAt: now,
    })
        .where(and(eq(usersCredentials.id, credentialId), isNull(usersCredentials.deletedAt)));
};
export const updateActiveCredentialsPasswordForUser = async (userId, password, executor = db) => {
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
        .where(and(eq(usersCredentials.userId, userId), eq(usersCredentials.status, "ATIVO"), isNull(usersCredentials.deletedAt)));
};
export const createCredential = async (input, executor = db) => {
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
