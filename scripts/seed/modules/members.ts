import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../src/db/index.js";
import {
  enterprisesMembers,
  users,
} from "../../../src/db/schema.js";
import { SEED_VOLUMES } from "../lib/constants.js";
import {
  ensureMemberDepartmentLink,
  ensureMemberPermissionsFromDepartments,
} from "../lib/department-helpers.js";
import { resolveBootstrapContext } from "../lib/context.js";
import { listFictitiousUserIds } from "./fictitious-users.js";

const MEMBER_CLASSES = ["COLABORADOR", "GERENTE", "CLIENTE"] as const;

export async function seedMembers(): Promise<string[]> {
  const ctx = await resolveBootstrapContext();
  const operacionalId = ctx.departmentIds.get("Operacional");
  const comercialId = ctx.departmentIds.get("Comercial");
  const mainDeptId =
    comercialId ?? operacionalId ?? ctx.departmentIds.get("Administrativo");

  if (!mainDeptId) {
    throw new Error(
      "Nenhum departamento disponivel para vincular membros. Execute seed de departamentos.",
    );
  }

  const fictitiousIds = await listFictitiousUserIds();
  const targetUserIds = fictitiousIds.slice(0, SEED_VOLUMES.members);

  console.log(
    `Seed membros: vinculando ${String(targetUserIds.length)} usuarios ficticios...`,
  );

  const memberIds: string[] = [];
  const now = new Date();

  for (let i = 0; i < targetUserIds.length; i++) {
    const userId = targetUserIds[i]!;

    const existing = await db
      .select({ id: enterprisesMembers.id })
      .from(enterprisesMembers)
      .where(
        and(
          eq(enterprisesMembers.userId, userId),
          eq(enterprisesMembers.enterpriseId, ctx.enterpriseId),
          isNull(enterprisesMembers.deletedAt),
        ),
      )
      .limit(1);

    let memberId: string;

    if (existing[0]) {
      memberId = existing[0].id;
    } else {
      const memberClass = MEMBER_CLASSES[i % MEMBER_CLASSES.length]!;
      const [member] = await db
        .insert(enterprisesMembers)
        .values({
          code: 1000 + i,
          userId,
          enterpriseId: ctx.enterpriseId,
          class: memberClass,
          includedBy: ctx.adminUserId,
          approvedAt: now,
          status: "ATIVO",
        })
        .returning();
      memberId = member!.id;
      console.log(`  Membro criado (${memberClass}): ${memberId}`);
    }

    memberIds.push(memberId);

    const memberDepartmentId = await ensureMemberDepartmentLink({
      memberId,
      departmentId: mainDeptId,
      mainDepartment: true,
    });

    await ensureMemberPermissionsFromDepartments({
      memberDepartmentIdsByDepartmentId: new Map([[mainDeptId, memberDepartmentId]]),
      departmentIds: [mainDeptId],
    });
  }

  console.log(`Seed membros concluido (${String(memberIds.length)} vinculos).`);
  return memberIds;
}

export async function listMemberIdsForEnterprise(
  enterpriseId: string,
): Promise<Array<{ memberId: string; userId: string; userName: string }>> {
  const rows = await db
    .select({
      memberId: enterprisesMembers.id,
      userId: enterprisesMembers.userId,
      userName: users.userName,
    })
    .from(enterprisesMembers)
    .innerJoin(users, eq(users.id, enterprisesMembers.userId))
    .where(
      and(
        eq(enterprisesMembers.enterpriseId, enterpriseId),
        isNull(enterprisesMembers.deletedAt),
        isNull(users.deletedAt),
      ),
    );

  return rows;
}

export async function listClientUserIds(enterpriseId: string): Promise<string[]> {
  const rows = await db
    .select({ userId: enterprisesMembers.userId })
    .from(enterprisesMembers)
    .where(
      and(
        eq(enterprisesMembers.enterpriseId, enterpriseId),
        eq(enterprisesMembers.class, "CLIENTE"),
        isNull(enterprisesMembers.deletedAt),
      ),
    );

  return rows.map((r) => r.userId);
}

export async function getAdminMemberId(enterpriseId: string): Promise<string> {
  const ctx = await resolveBootstrapContext();
  const rows = await db
    .select({ id: enterprisesMembers.id })
    .from(enterprisesMembers)
    .where(
      and(
        eq(enterprisesMembers.userId, ctx.adminUserId),
        eq(enterprisesMembers.enterpriseId, enterpriseId),
        isNull(enterprisesMembers.deletedAt),
      ),
    )
    .limit(1);

  const memberId = rows[0]?.id;
  if (!memberId) {
    throw new Error("Membro admin nao encontrado na empresa bootstrap.");
  }
  return memberId;
}
