import { and, eq, isNull } from "drizzle-orm";
import { enterprises, enterprisesMembers } from "../../db/schema.js";

/** Vínculo enterprises_members ativo para o enterpriseId informado. */
export const activeMembershipForEnterprise = (enterpriseId: string) =>
  and(
    eq(enterprisesMembers.enterpriseId, enterpriseId),
    eq(enterprisesMembers.status, "ATIVO"),
    isNull(enterprisesMembers.deletedAt),
  );

/** Predicado SQL para linha de enterprises ativa (status e soft delete). */
export const activeEnterpriseRow = () =>
  and(eq(enterprises.status, "ATIVO"), isNull(enterprises.deletedAt));

type EnterpriseRow = {
  status: (typeof enterprises.$inferSelect)["status"];
  deletedAt: Date | null;
};

/** Valida enterprise carregada via relação após fetch (Drizzle não filtra `one` aninhado). */
export const isActiveEnterprise = (enterprise: EnterpriseRow | null | undefined) =>
  enterprise?.status === "ATIVO" && enterprise.deletedAt == null;

/** Predicado SQL para vínculos ativos de um utilizador (listagem de empresas). */
export const activeUserMembershipWhere = (userId: string) =>
  and(
    eq(enterprisesMembers.userId, userId),
    eq(enterprisesMembers.status, "ATIVO"),
    isNull(enterprisesMembers.deletedAt),
  );

type MembershipWithEnterprise = {
  enterprise?: EnterpriseRow | null;
};

/** Valida membership com enterprise ativa após fetch relacional. */
export const hasActiveTenantMembership = (
  memberships: MembershipWithEnterprise[] | undefined,
) =>
  memberships?.some((membership) => isActiveEnterprise(membership.enterprise)) ??
  false;
