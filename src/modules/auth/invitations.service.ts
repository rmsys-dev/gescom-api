import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import {
  departmentDefaultPermissions,
  enterprises,
  enterprisesMembers,
  memberPermissionsDefault,
  membersDepartments,
  users,
} from "../../db/schema.js";
import {
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from "../../shared/errors/app-error.js";
import { sendMembershipInviteCode } from "../../shared/notifications/email-sender.js";
import { addMinutesFromNow } from "../../shared/time/duration.js";
import { env } from "../../config/env.js";
import { PERM } from "./default-permissions.js";
import { type AuthLoginType, writeAudit } from "./audit.js";
import {
  consumeInvite,
  createInvitationRow,
  findPendingInviteForMembership,
  generateNumericInviteCode,
  incrementInviteAttempts,
  invalidatePendingInvites,
  isInviteExpired,
  softDeleteInvite,
} from "./invitations-repository.js";
import { verifyLoginCredentials } from "./credentials.js";
import { mapAuthUser, mapEnterprises } from "./enterprise-map.js";
import { isAllowed, resolvePermissions } from "./permissions.js";
import { hashPassword, verifyPassword } from "./password.js";
import {
  findMembershipContextByMemberId,
  listActiveEnterprisesForUser,
  revokeAllSessionsForUser,
} from "./repository.js";
import { issueSessionTokens } from "./session-tokens.js";
import {
  membershipSoftDeleteValues,
  touchUpdatedAt,
} from "../../shared/db/record-lifecycle.js";
import {
  recordSoftDeleteAudit,
  type EntityAuditContext,
} from "../../shared/audit/entity-audit.js";
import { EntityTypes } from "../../shared/audit/entity-types.js";

type AuthMeta = {
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
};

type InviteMembershipContext = {
  member: typeof enterprisesMembers.$inferSelect;
  enterprise: typeof enterprises.$inferSelect;
  user: typeof users.$inferSelect;
};

const loadInviteMembershipOrThrow = async (
  memberId: string,
): Promise<InviteMembershipContext> => {
  const ctx = await loadMemberContext(memberId);
  if (!ctx) {
    throw new NotFoundError("Vinculo nao encontrado", "MEMBER_NOT_FOUND");
  }
  return ctx;
};

/** Empresa do vínculo do convite deve coincidir com a empresa da sessão (`req.auth.enterpriseId`). */
const assertInviteSessionTenant = async (
  enterpriseId: string,
  sessionEnterpriseId: string,
  audit: {
    userId: string;
    ipAddress: string | null;
    userAgent: string | null;
    requestId: string | null;
    reason: string;
  },
): Promise<void> => {
  if (sessionEnterpriseId !== enterpriseId) {
    await writeAudit({
      event: "PERMISSION_DENIED",
      userId: audit.userId,
      enterpriseId,
      ipAddress: audit.ipAddress,
      userAgent: audit.userAgent,
      requestId: audit.requestId,
      reason: audit.reason,
    });
    throw new ForbiddenError(
      "Contexto de empresa invalido para esta operacao de convite",
      "INVITE_TENANT_MISMATCH",
    );
  }
};

export const loadMemberContext = async (memberId: string) => {
  const rows = await db
    .select({
      member: enterprisesMembers,
      enterprise: enterprises,
      user: users,
    })
    .from(enterprisesMembers)
    .innerJoin(enterprises, eq(enterprises.id, enterprisesMembers.enterpriseId))
    .innerJoin(users, eq(users.id, enterprisesMembers.userId))
    .where(
      and(
        eq(enterprisesMembers.id, memberId),
        isNull(enterprisesMembers.deletedAt),
        eq(enterprises.status, "ATIVO"),
        isNull(enterprises.deletedAt),
        isNull(users.deletedAt),
      ),
    )
    .limit(1);

  return rows[0] ?? null;
};

export const acceptMembershipInvitationCore = async (
  input: {
    memberId: string;
    actorUserId: string;
    code: string;
  } & AuthMeta,
): Promise<{ enterpriseId: string }> => {
  const ctx = await loadInviteMembershipOrThrow(input.memberId);
  const { member, enterprise } = ctx;

  if (member.userId !== input.actorUserId) {
    await writeAudit({
      event: "PERMISSION_DENIED",
      userId: input.actorUserId,
      enterpriseId: enterprise.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Aceite de convite por usuario divergente",
    });
    throw new ForbiddenError(
      "Voce nao pode aceitar este convite",
      "INVITE_FORBIDDEN",
    );
  }

  if (member.status !== "PENDENTE") {
    throw new ForbiddenError(
      "Convite invalido ou ja processado",
      "INVITE_INVALID_STATE",
    );
  }

  const invite = await findPendingInviteForMembership(member.id);
  if (!invite || isInviteExpired(invite)) {
    await writeAudit({
      event: "INVITE_EXPIRED",
      userId: input.actorUserId,
      enterpriseId: enterprise.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Convite ausente ou expirado",
    });
    throw new UnauthorizedError(
      "Codigo invalido ou expirado",
      "INVITE_INVALID",
    );
  }

  const codeDigits = input.code.replace(/\D/g, "");
  const ok = await verifyPassword(codeDigits, invite.codeHash);

  if (!ok) {
    const nextAttempts = invite.attempts + 1;
    await incrementInviteAttempts(invite.id, invite.attempts);
    if (nextAttempts >= invite.maxAttempts) {
      await softDeleteInvite(invite.id);
      await writeAudit({
        event: "INVITE_EXPIRED",
        userId: input.actorUserId,
        enterpriseId: enterprise.id,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        requestId: input.requestId,
        reason: "Max tentativas de codigo",
      });
    } else {
      await writeAudit({
        event: "FIRST_ACCESS_FAILED",
        userId: input.actorUserId,
        enterpriseId: enterprise.id,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        requestId: input.requestId,
        reason: "Codigo incorreto (membership)",
      });
    }
    throw new UnauthorizedError(
      "Codigo invalido ou expirado",
      "INVITE_INVALID",
    );
  }

  const now = new Date();
  await db.transaction(async (tx) => {
    await consumeInvite(invite.id, tx);

    const pendingDeptRows = await tx
      .select({
        id: membersDepartments.id,
        departmentId: membersDepartments.departmentId,
      })
      .from(membersDepartments)
      .where(
        and(
          eq(membersDepartments.memberId, member.id),
          eq(membersDepartments.status, "PENDENTE"),
          isNull(membersDepartments.deletedAt),
        ),
      );

    const memberDepartmentIdByDepartmentId = new Map(
      pendingDeptRows.map((r) => [r.departmentId, r.id]),
    );
    const departmentIds = pendingDeptRows.map((r) => r.departmentId);

    if (pendingDeptRows.length > 0) {
      await tx
        .update(membersDepartments)
        .set({ status: "ATIVO", ...touchUpdatedAt(now) })
        .where(
          and(
            inArray(
              membersDepartments.id,
              pendingDeptRows.map((row) => row.id),
            ),
            isNull(membersDepartments.deletedAt),
          ),
        );
    }

    if (departmentIds.length > 0) {
      const snapshotPermissions = await tx
        .select({
          departmentId: departmentDefaultPermissions.departmentId,
          permission: departmentDefaultPermissions.permission,
          status: departmentDefaultPermissions.status,
        })
        .from(departmentDefaultPermissions)
        .where(
          and(
            inArray(departmentDefaultPermissions.departmentId, departmentIds),
            isNull(departmentDefaultPermissions.deletedAt),
          ),
        );

      const memberPermissions = snapshotPermissions.map((perm) => {
        const memberDepartmentId = memberDepartmentIdByDepartmentId.get(
          perm.departmentId,
        );
        if (!memberDepartmentId) {
          throw new InternalServerError(
            "Falha ao associar permissoes do departamento",
            "INTERNAL_ERROR",
          );
        }
        return {
          memberDepartmentId,
          permission: perm.permission,
          status: perm.status,
        };
      });

      if (memberPermissions.length > 0) {
        await tx.insert(memberPermissionsDefault).values(memberPermissions);
      }
    }

    const [activatedMember] = await tx
      .update(enterprisesMembers)
      .set({
        status: "ATIVO",
        approvedAt: now,
        ...touchUpdatedAt(now),
      })
      .where(
        and(
          eq(enterprisesMembers.id, member.id),
          isNull(enterprisesMembers.deletedAt),
        ),
      )
      .returning();

    if (!activatedMember) {
      throw new NotFoundError("Vinculo nao encontrado", "MEMBER_NOT_FOUND");
    }
  });

  await writeAudit({
    event: "INVITE_ACCEPTED",
    userId: input.actorUserId,
    enterpriseId: enterprise.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    requestId: input.requestId,
  });

  return { enterpriseId: enterprise.id };
};

export const acceptMembershipInvitationPublic = async (
  input: {
    memberId: string;
    loginType: AuthLoginType;
    login: string;
    password: string;
    code: string;
  } & AuthMeta,
): Promise<{
  accessToken: string;
  refreshToken: string;
  user: ReturnType<typeof mapAuthUser>;
  enterprises: ReturnType<typeof mapEnterprises>;
}> => {
  const { user } = await verifyLoginCredentials({
    loginType: input.loginType,
    login: input.login,
    password: input.password,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    requestId: input.requestId,
  });

  await acceptMembershipInvitationCore({
    memberId: input.memberId,
    actorUserId: user.id,
    code: input.code,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    requestId: input.requestId,
  });

  await revokeAllSessionsForUser(user.id, "INVITE_ACCEPT_REPLACED");

  const memberCtx = await findMembershipContextByMemberId(input.memberId);
  if (!memberCtx) {
    throw new ForbiddenError(
      "Vinculo com empresa invalido apos aceite",
      "ENTERPRISE_FORBIDDEN",
    );
  }

  const tokens = await issueSessionTokens({
    userId: user.id,
    enterpriseId: memberCtx.enterpriseId,
    memberId: memberCtx.memberId,
    memberDepartmentId: memberCtx.memberDepartmentId,
    userAgent: input.userAgent,
    ipAddress: input.ipAddress,
  });

  const memberships = await listActiveEnterprisesForUser(user.id);

  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    user: mapAuthUser(user),
    enterprises: mapEnterprises(memberships),
  };
};

export const declineMembershipInvitation = async (
  input: {
    memberId: string;
    actorUserId: string;
    sessionEnterpriseId: string;
    reason?: string | null;
  } & AuthMeta,
): Promise<{ ok: true }> => {
  const ctx = await loadInviteMembershipOrThrow(input.memberId);
  const { member, enterprise } = ctx;

  await assertInviteSessionTenant(enterprise.id, input.sessionEnterpriseId, {
    userId: input.actorUserId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    requestId: input.requestId,
    reason: "Recusa de convite fora do tenant da sessao",
  });

  if (member.userId !== input.actorUserId) {
    throw new ForbiddenError(
      "Voce nao pode recusar este convite",
      "INVITE_FORBIDDEN",
    );
  }

  if (member.status !== "PENDENTE") {
    throw new ForbiddenError(
      "Convite invalido ou ja processado",
      "INVITE_INVALID_STATE",
    );
  }

  const now = new Date();
  const auditCtx: EntityAuditContext = {
    actorUserId: input.actorUserId,
    enterpriseId: enterprise.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    requestId: input.requestId,
    reason: input.reason ?? null,
  };

  await db.transaction(async (tx) => {
    await invalidatePendingInvites(
      {
        userId: member.userId,
        purpose: "MEMBERSHIP_ACCEPT",
        memberId: member.id,
      },
      tx,
    );

    const [memberRow] = await tx
      .update(enterprisesMembers)
      .set(membershipSoftDeleteValues(now))
      .where(
        and(
          eq(enterprisesMembers.id, member.id),
          isNull(enterprisesMembers.deletedAt),
        ),
      )
      .returning();

    if (!memberRow) {
      throw new NotFoundError("Vinculo nao encontrado", "MEMBER_NOT_FOUND");
    }

    await recordSoftDeleteAudit({
      entityType: EntityTypes.ENTERPRISES_MEMBERS,
      entityId: member.id,
      before: member,
      after: memberRow,
      ctx: auditCtx,
      tx,
    });
  });

  await writeAudit({
    event: "INVITE_DECLINED",
    userId: input.actorUserId,
    enterpriseId: enterprise.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    requestId: input.requestId,
    reason: input.reason ?? null,
  });

  return { ok: true };
};

export const resendMembershipInvitation = async (
  input: {
    memberId: string;
    actorUserId: string;
    sessionEnterpriseId: string;
    actorMemberDepartmentId?: string | null;
  } & AuthMeta,
): Promise<{ ok: true }> => {
  const ctx = await loadInviteMembershipOrThrow(input.memberId);
  const { member, enterprise, user } = ctx;

  await assertInviteSessionTenant(enterprise.id, input.sessionEnterpriseId, {
    userId: input.actorUserId,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    requestId: input.requestId,
    reason: "Reenvio de convite fora do tenant da sessao",
  });

  if (member.status !== "PENDENTE") {
    throw new ForbiddenError(
      "Nao ha convite pendente para este vinculo",
      "INVITE_INVALID_STATE",
    );
  }

  const isInvitee = member.userId === input.actorUserId;
  const isInviter =
    member.includedBy !== null && member.includedBy === input.actorUserId;

  if (!isInvitee && !isInviter) {
    await writeAudit({
      event: "PERMISSION_DENIED",
      userId: input.actorUserId,
      enterpriseId: enterprise.id,
      ipAddress: input.ipAddress,
      userAgent: input.userAgent,
      requestId: input.requestId,
      reason: "Reenvio de convite sem ser convidado nem quem incluiu",
    });
    throw new ForbiddenError(
      "Sem permissao para reenviar este convite",
      "INVITE_RESEND_FORBIDDEN",
    );
  }

  if (isInviter && !isInvitee) {
    if (!input.actorMemberDepartmentId) {
      await writeAudit({
        event: "PERMISSION_DENIED",
        userId: input.actorUserId,
        enterpriseId: enterprise.id,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        requestId: input.requestId,
        reason: "Reenvio de convite sem departamento principal na sessao",
      });
      throw new ForbiddenError(
        "Departamento principal do usuario nao definido",
        "MEMBER_DEPARTMENT_MISSING",
      );
    }
    const resolved = await resolvePermissions(input.actorMemberDepartmentId);
    if (!isAllowed(resolved, PERM.incluir_membros)) {
      await writeAudit({
        event: "PERMISSION_DENIED",
        userId: input.actorUserId,
        enterpriseId: enterprise.id,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
        requestId: input.requestId,
        reason: "Reenvio de convite sem permissao incluir_membros",
      });
      throw new ForbiddenError(
        "Sem permissao para reenviar este convite",
        "INVITE_RESEND_FORBIDDEN",
      );
    }
  }

  const plainCode = generateNumericInviteCode();
  const codeHash = await hashPassword(plainCode);
  const expiresAt = addMinutesFromNow(env.INVITATION_CODE_TTL_MINUTES);

  if (!user.userEmail) {
    throw new ForbiddenError(
      "Usuario sem e-mail cadastrado para reenvio de convite",
      "INVITE_RESEND_NO_EMAIL",
    );
  }

  const recipientEmail = user.userEmail;

  await db.transaction(async (tx) => {
    await invalidatePendingInvites(
      {
        userId: member.userId,
        purpose: "MEMBERSHIP_ACCEPT",
        memberId: member.id,
      },
      tx,
    );

    await createInvitationRow(
      {
        userId: member.userId,
        purpose: "MEMBERSHIP_ACCEPT",
        memberId: member.id,
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

  await sendMembershipInviteCode({
    to: recipientEmail,
    code: plainCode,
    userName: user.userName,
    enterpriseTradeName: enterprise.tradeName,
  });

  await writeAudit({
    event: "INVITE_CREATED",
    userId: input.actorUserId,
    enterpriseId: enterprise.id,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    requestId: input.requestId,
    reason: "Reenvio de convite de membro",
  });

  return { ok: true };
};
