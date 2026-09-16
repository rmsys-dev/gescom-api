import { and, eq, isNull } from "drizzle-orm";
import { enterprises, enterprisesMembers } from "../../db/schema.js";
/** Vínculo enterprises_members ativo para o enterpriseId informado. */
export const activeMembershipForEnterprise = (enterpriseId) => and(eq(enterprisesMembers.enterpriseId, enterpriseId), eq(enterprisesMembers.status, "ATIVO"), isNull(enterprisesMembers.deletedAt));
/** Predicado SQL para linha de enterprises ativa (status e soft delete). */
export const activeEnterpriseRow = () => and(eq(enterprises.status, "ATIVO"), isNull(enterprises.deletedAt));
/** Valida enterprise carregada via relação após fetch (Drizzle não filtra `one` aninhado). */
export const isActiveEnterprise = (enterprise) => enterprise?.status === "ATIVO" && enterprise.deletedAt == null;
/** Predicado SQL para vínculos ativos de um utilizador (listagem de empresas). */
export const activeUserMembershipWhere = (userId) => and(eq(enterprisesMembers.userId, userId), eq(enterprisesMembers.status, "ATIVO"), isNull(enterprisesMembers.deletedAt));
/** Valida membership com enterprise ativa após fetch relacional. */
export const hasActiveTenantMembership = (memberships) => memberships?.some((membership) => isActiveEnterprise(membership.enterprise)) ??
    false;
