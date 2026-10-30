import { aliasedTable, and, eq, inArray } from "drizzle-orm";
import { db, enterprisesMembers, sales } from "../../db/schema.js";

const sameUserMember = aliasedTable(enterprisesMembers, "same_user_member");

/**
 * Pedidos de qualquer vínculo da mesma pessoa na empresa, inclusive
 * vínculo antigo excluído. A busca de cliente devolve o vínculo ativo.
 */
export const salesOfSameMemberUser = (enterpriseId: string, memberId: string) =>
  inArray(
    sales.memberId,
    db
      .select({ id: sameUserMember.id })
      .from(sameUserMember)
      .innerJoin(
        enterprisesMembers,
        and(
          eq(enterprisesMembers.id, memberId),
          eq(enterprisesMembers.enterpriseId, enterpriseId),
          eq(sameUserMember.userId, enterprisesMembers.userId),
          eq(sameUserMember.enterpriseId, enterpriseId),
        ),
      ),
  );
