import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import { enterprises, enterprisesMembers, users } from "../../db/schema.js";
import {
  activeEnterpriseRow,
  activeMembershipForEnterprise,
} from "../../shared/db/tenant-predicates.js";

// Indica se o enterprises_members (ator) existe, está ativo nesse tenant e a empresa está ativa
export const actorHasTenantScope = async (
  memberId: string,
  enterpriseId: string,
): Promise<boolean> => {
  const rows = await db
    .select({ id: enterprisesMembers.id })
    .from(enterprisesMembers)
    .innerJoin(enterprises, eq(enterprises.id, enterprisesMembers.enterpriseId))
    .where(
      and(
        eq(enterprisesMembers.id, memberId),
        activeMembershipForEnterprise(enterpriseId),
        activeEnterpriseRow(),
      ),
    )
    .limit(1);
  return rows.length > 0;
};

//Busca um usuário pelo ID: modo de leitura já resolvido pelo middleware `resolveUserReadAccess`
export const findUserByIdScoped = async (
  userId: string,
  enterpriseId: string,
): Promise<typeof users.$inferSelect | null> => {
  const rows = await db
    .select({ user: users })
    .from(enterprisesMembers)
    .innerJoin(users, eq(users.id, enterprisesMembers.userId))
    .innerJoin(enterprises, eq(enterprises.id, enterprisesMembers.enterpriseId))
    .where(
      and(
        eq(users.id, userId),
        isNull(users.deletedAt),
        activeMembershipForEnterprise(enterpriseId),
        activeEnterpriseRow(),
      ),
    )
    .limit(1);
  return rows[0]?.user ?? null;
};

//Busca um usuário pelo registro: modo de leitura já resolvido pelo middleware `resolveUserReadAccess`
export const findUserByRegistrationScoped = async (
  registration: string,
  enterpriseId: string,
): Promise<typeof users.$inferSelect | null> => {
  const rows = await db
    .select({ user: users })
    .from(enterprisesMembers)
    .innerJoin(users, eq(users.id, enterprisesMembers.userId))
    .innerJoin(enterprises, eq(enterprises.id, enterprisesMembers.enterpriseId))
    .where(
      and(
        eq(users.userRegistration, registration),
        isNull(users.deletedAt),
        activeMembershipForEnterprise(enterpriseId),
        activeEnterpriseRow(),
      ),
    )
    .limit(1);
  return rows[0]?.user ?? null;
};

//Busca um usuário pelo email: modo de leitura já resolvido pelo middleware `resolveUserReadAccess`
export const findUserByEmailScoped = async (
  email: string,
  enterpriseId: string,
): Promise<typeof users.$inferSelect | null> => {
  const rows = await db
    .select({ user: users })
    .from(enterprisesMembers)
    .innerJoin(users, eq(users.id, enterprisesMembers.userId))
    .innerJoin(enterprises, eq(enterprises.id, enterprisesMembers.enterpriseId))
    .where(
      and(
        eq(users.userEmail, email),
        isNull(users.deletedAt),
        activeMembershipForEnterprise(enterpriseId),
        activeEnterpriseRow(),
      ),
    )
    .limit(1);
  return rows[0]?.user ?? null;
};

//Busca um usuário pelo telefone: modo de leitura já resolvido pelo middleware `resolveUserReadAccess`
export const findUserByPhoneScoped = async (
  phone: string,
  enterpriseId: string,
): Promise<typeof users.$inferSelect | null> => {
  const rows = await db
    .select({ user: users })
    .from(enterprisesMembers)
    .innerJoin(users, eq(users.id, enterprisesMembers.userId))
    .innerJoin(enterprises, eq(enterprises.id, enterprisesMembers.enterpriseId))
    .where(
      and(
        eq(users.userPhone, phone),
        isNull(users.deletedAt),
        activeMembershipForEnterprise(enterpriseId),
        activeEnterpriseRow(),
      ),
    )
    .limit(1);
  return rows[0]?.user ?? null;
};
