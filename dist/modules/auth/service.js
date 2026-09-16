import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import { memberModules, modulePermissions, users } from "../../db/schema.js";
import { activeMembershipForEnterprise, isActiveEnterprise, } from "../../shared/db/tenant-predicates.js";
import { ForbiddenError, UnauthorizedError, } from "../../shared/errors/app-error.js";
import { writeAudit } from "./audit.js";
import { verifyLoginCredentials } from "./credentials.js";
import { mapAuthUser, mapEnterprises } from "./enterprise-map.js";
import { findActiveSessionByJti, findAnySessionByJti, findMembershipContext, findMembershipContextByMemberIdForUser, findSessionById, findUserById, listActiveEnterprisesForUser, revokeAllSessionsForUser, revokeMatchingClientSessionsForUser, revokeSession, } from "./repository.js";
import { verifyRefreshToken, hashRefreshToken } from "./tokens.js";
import { issueSessionTokens } from "./session-tokens.js";
import { filterPermissionsByParameters, } from "../enterprises/parameters/catalog.js";
import { resolveEnterpriseParameters } from "../enterprises/parameters/resolve.js";
export class AuthService {
    async login(input) {
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
            throw new ForbiddenError("Usuario nao possui vinculo ativo com empresa", "ENTERPRISE_FORBIDDEN");
        }
        await revokeMatchingClientSessionsForUser(user.id, input.ipAddress, input.userAgent, "LOGIN_REPLACED");
        const selectedMembership = memberships[0];
        const tokens = await issueSessionTokens({
            userId: user.id,
            enterpriseId: selectedMembership.enterpriseId,
            memberId: selectedMembership.memberId,
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
            enterprises: await mapEnterprises(memberships),
        };
    }
    async refresh(input) {
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
            throw new UnauthorizedError("Refresh token invalido", "INVALID_REFRESH_TOKEN");
        }
        if (sessionByJti.id !== claims.sid) {
            await revokeAllSessionsForUser(sessionByJti.userId, "REFRESH_REUSE");
            throw new UnauthorizedError("Refresh token invalido", "INVALID_REFRESH_TOKEN");
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
            throw new UnauthorizedError("Refresh token invalido", "INVALID_REFRESH_TOKEN");
        }
        const user = await findUserById(sessionByJti.userId);
        if (!user || user.status !== "ATIVO") {
            await revokeSession(sessionByJti.id, "USER_INACTIVE");
            throw new ForbiddenError("Usuario inativo ou bloqueado", "USER_INACTIVE");
        }
        let memberId = null;
        let enterpriseId = claims.ent ?? null;
        if (enterpriseId) {
            const ctx = await findMembershipContext(sessionByJti.userId, enterpriseId);
            if (!ctx) {
                await revokeSession(sessionByJti.id, "ENTERPRISE_INVALID");
                throw new ForbiddenError("Vinculo com empresa invalido", "ENTERPRISE_FORBIDDEN");
            }
            memberId = ctx.memberId;
        }
        else if (sessionByJti.memberId) {
            const ctx = await findMembershipContextByMemberIdForUser(sessionByJti.memberId, sessionByJti.userId);
            if (!ctx) {
                await revokeSession(sessionByJti.id, "ENTERPRISE_INVALID");
                throw new ForbiddenError("Vinculo com empresa invalido", "ENTERPRISE_FORBIDDEN");
            }
            enterpriseId = ctx.enterpriseId;
            memberId = ctx.memberId;
        }
        else {
            await revokeSession(sessionByJti.id, "INVALID_SESSION");
            throw new UnauthorizedError("Sessao invalida", "INVALID_SESSION");
        }
        const tokens = await issueSessionTokens({
            userId: sessionByJti.userId,
            enterpriseId,
            memberId,
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
    async logout(input) {
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
    async switchEnterprise(input) {
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
            throw new ForbiddenError("Vinculo com empresa invalido", "ENTERPRISE_FORBIDDEN");
        }
        const session = await findSessionById(input.sessionId);
        if (!session || session.revokedAt) {
            throw new UnauthorizedError("Sessao invalida", "INVALID_SESSION");
        }
        const tokens = await issueSessionTokens({
            userId: input.userId,
            enterpriseId: input.enterpriseId,
            memberId: ctx.memberId,
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
                parameters: await resolveEnterpriseParameters(input.enterpriseId),
            },
        };
    }
    async me(input) {
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
                    registration: user.userRegistration ?? null,
                    phone: user.userPhone ?? null,
                    onboardingCompleted: user.onboardingCompleted,
                },
                enterprise: null,
                modules: [],
            };
        }
        const row = await db.query.users.findFirst({
            where: and(eq(users.id, input.userId), isNull(users.deletedAt)),
            with: {
                memberships: {
                    where: activeMembershipForEnterprise(input.enterpriseId),
                    with: {
                        enterprise: true,
                        modules: {
                            where: and(eq(memberModules.status, "ATIVO"), isNull(memberModules.deletedAt)),
                            with: {
                                module: true,
                                permissions: {
                                    where: eq(modulePermissions.status, "ALLOW"),
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!row) {
            throw new UnauthorizedError("Usuario nao encontrado", "USER_NOT_FOUND");
        }
        const membership = row.memberships.find((item) => isActiveEnterprise(item.enterprise));
        let enterpriseInfo = null;
        let modules = [];
        if (membership?.enterprise) {
            const parameters = await resolveEnterpriseParameters(membership.enterprise.id);
            enterpriseInfo = {
                id: membership.enterprise.id,
                tradeName: membership.enterprise.tradeName,
                legalName: membership.enterprise.legalName,
                memberId: membership.id,
                parameters,
            };
            modules = membership.modules
                .filter((item) => item.module != null && item.module.deletedAt == null)
                .sort((left, right) => (left.module?.name ?? "").localeCompare(right.module?.name ?? ""))
                .map((item) => ({
                memberModuleId: item.id,
                moduleId: item.moduleId,
                reference: item.module.reference,
                name: item.module.name,
                accessLevel: item.accessLevel,
                permissions: filterPermissionsByParameters(item.permissions.map((perm) => perm.permission), parameters),
            }));
        }
        return {
            user: {
                id: row.id,
                name: row.userName,
                email: row.userEmail ?? null,
                registration: row.userRegistration ?? null,
                phone: row.userPhone ?? null,
                onboardingCompleted: row.onboardingCompleted,
            },
            enterprise: enterpriseInfo,
            modules,
        };
    }
}
export const authService = new AuthService();
