import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  enterprises,
  enterprisesAddress,
  enterprisesMembers,
  enterprisesSequences,
  memberExtraPermissions,
  memberPermissionsDefault,
  membersDepartments,
  userInvitations,
} from "../../db/schema.js";
import type { DbExecutor } from "../../modules/auth/repository.js";
import { softDeleteValues } from "./record-lifecycle.js";

type Tx = Exclude<DbExecutor, typeof import("../../db/schema.js").db>;

export const cascadeSoftDeleteEnterprise = async (
  enterpriseId: string,
  tx: Tx,
): Promise<void> => {
  const now = new Date();

  // 1) Membros ativos da empresa
  const memberRows = await tx
    .select({ id: enterprisesMembers.id })
    .from(enterprisesMembers)
    .where(
      and(
        eq(enterprisesMembers.enterpriseId, enterpriseId),
        isNull(enterprisesMembers.deletedAt),
      ),
    );
  const memberIds = memberRows.map((r) => r.id);

  // 2) Vínculos membro-departamento ativos dos membros
  let memberDepartmentIds: string[] = [];
  if (memberIds.length > 0) {
    const mdRows = await tx
      .select({ id: membersDepartments.id })
      .from(membersDepartments)
      .where(
        and(
          inArray(membersDepartments.memberId, memberIds),
          isNull(membersDepartments.deletedAt),
        ),
      );
    memberDepartmentIds = mdRows.map((r) => r.id);
  }

  // 3) Soft delete em lote: permissões -> vínculos membro-departamento
  if (memberDepartmentIds.length > 0) {
    await tx
      .update(memberExtraPermissions)
      .set(softDeleteValues(now))
      .where(
        and(
          inArray(
            memberExtraPermissions.memberDepartmentId,
            memberDepartmentIds,
          ),
          isNull(memberExtraPermissions.deletedAt),
        ),
      );

    await tx
      .update(memberPermissionsDefault)
      .set(softDeleteValues(now))
      .where(
        and(
          inArray(
            memberPermissionsDefault.memberDepartmentId,
            memberDepartmentIds,
          ),
          isNull(memberPermissionsDefault.deletedAt),
        ),
      );

    await tx
      .update(membersDepartments)
      .set({
        ...softDeleteValues(now, { status: "INATIVO" as const }),
        mainDepartment: false,
      })
      .where(
        and(
          inArray(membersDepartments.id, memberDepartmentIds),
          isNull(membersDepartments.deletedAt),
        ),
      );
  }

  // 4) Soft delete dos membros da empresa
  if (memberIds.length > 0) {
    await tx
      .update(enterprisesMembers)
      .set({
        ...softDeleteValues(now, { status: "INATIVO" as const }),
        approvedAt: null,
      })
      .where(
        and(
          inArray(enterprisesMembers.id, memberIds),
          isNull(enterprisesMembers.deletedAt),
        ),
      );

    // 5) Soft delete de convites pendentes (membership) para os membros afetados
    await tx
      .update(userInvitations)
      .set(softDeleteValues(now))
      .where(
        and(
          inArray(userInvitations.memberId, memberIds),
          eq(userInvitations.purpose, "MEMBERSHIP_ACCEPT"),
          isNull(userInvitations.consumedAt),
          isNull(userInvitations.deletedAt),
        ),
      );
  }

  // 6) Soft delete de dependências diretas da empresa
  await tx
    .update(enterprisesAddress)
    .set(softDeleteValues(now))
    .where(
      and(
        eq(enterprisesAddress.enterpriseId, enterpriseId),
        isNull(enterprisesAddress.deletedAt),
      ),
    );

  await tx
    .update(enterprisesSequences)
    .set(softDeleteValues(now))
    .where(
      and(
        eq(enterprisesSequences.enterpriseId, enterpriseId),
        isNull(enterprisesSequences.deletedAt),
      ),
    );

  // 7) Soft delete da empresa (status + deletedAt)
  await tx
    .update(enterprises)
    .set(softDeleteValues(now, { status: "INATIVO" as const }))
    .where(
      and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)),
    );
};
