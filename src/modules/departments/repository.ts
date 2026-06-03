import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/schema.js";
import {
  departments,
  enterprisesMembers,
  membersDepartments,
} from "../../db/schema.js";

/** `departments.id` do vínculo `members_departments` quando o membro pertence à empresa. */
export const findDepartmentIdForMemberDepartment = async (input: {
  memberDepartmentId: string;
  memberId: string;
  enterpriseId: string;
}): Promise<string | null> => {
  const rows = await db
    .select({ departmentId: membersDepartments.departmentId })
    .from(membersDepartments)
    .innerJoin(departments, eq(departments.id, membersDepartments.departmentId))
    .innerJoin(
      enterprisesMembers,
      and(
        eq(enterprisesMembers.id, membersDepartments.memberId),
        eq(enterprisesMembers.enterpriseId, input.enterpriseId),
        isNull(enterprisesMembers.deletedAt),
      ),
    )
    .where(
      and(
        eq(membersDepartments.id, input.memberDepartmentId),
        eq(membersDepartments.memberId, input.memberId),
        eq(membersDepartments.status, "ATIVO"),
        isNull(membersDepartments.deletedAt),
        isNull(departments.deletedAt),
      ),
    )
    .limit(1);

  return rows[0]?.departmentId ?? null;
};
