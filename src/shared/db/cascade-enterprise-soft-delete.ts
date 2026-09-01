import { and, eq, inArray, isNull } from "drizzle-orm";
import {
  enterprises,
  enterprisesAddress,
  enterpriseParameters,
  enterprisesMembers,
  enterprisesSequences,
  memberModules,
  modulePermissions,
  userInvitations,
} from "../../db/schema.js";
import type { DbExecutor } from "../../modules/auth/repository.js";
import { memberModuleSoftDeleteValues, softDeleteValues } from "./record-lifecycle.js";

type Tx = Exclude<DbExecutor, typeof import("../../db/schema.js").db>;

export const cascadeSoftDeleteEnterprise = async (
  enterpriseId: string,
  tx: Tx,
): Promise<void> => {
  const now = new Date();

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

  if (memberIds.length > 0) {
    const mmRows = await tx
      .select({ id: memberModules.id })
      .from(memberModules)
      .where(
        and(
          inArray(memberModules.memberId, memberIds),
          isNull(memberModules.deletedAt),
        ),
      );
    const memberModuleIds = mmRows.map((r) => r.id);

    if (memberModuleIds.length > 0) {
      await tx
        .delete(modulePermissions)
        .where(inArray(modulePermissions.memberModuleId, memberModuleIds));

      await tx
        .update(memberModules)
        .set(memberModuleSoftDeleteValues(now))
        .where(
          and(
            inArray(memberModules.id, memberModuleIds),
            isNull(memberModules.deletedAt),
          ),
        );
    }

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

    await tx
      .update(userInvitations)
      .set(softDeleteValues(now))
      .where(
        and(
          inArray(userInvitations.memberId, memberIds),
          isNull(userInvitations.consumedAt),
          isNull(userInvitations.deletedAt),
        ),
      );
  }

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

  await tx
    .update(enterpriseParameters)
    .set(softDeleteValues(now))
    .where(
      and(
        eq(enterpriseParameters.enterpriseId, enterpriseId),
        isNull(enterpriseParameters.deletedAt),
      ),
    );

  await tx
    .update(enterprises)
    .set(softDeleteValues(now, { status: "INATIVO" as const }))
    .where(
      and(eq(enterprises.id, enterpriseId), isNull(enterprises.deletedAt)),
    );
};
