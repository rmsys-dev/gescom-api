/**
 * Seed idempotente para testar troca de empresa no front:
 * cria uma segunda empresa e vincula o mesmo usuário admin do `seed-bootstrap.ts`
 * como ADMINISTRADOR (mesmo padrão de departamento principal + permissões espelhadas).
 *
 * Pré-requisito: `npm run seed:bootstrap` (departamento "Administrativo" e usuário admin).
 *
 * Uso: `npm run seed:enterprise-switch-test` ou `npx tsx scripts/seed-enterprise-switch-test.ts`
 *
 * O CPF abaixo deve permanecer alinhado a `BOOTSTRAP_SEED.adminCpf` em `seed-bootstrap.ts`.
 */
import "dotenv/config";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../src/db/index.js";
import {
  departmentDefaultPermissions,
  departments,
  enterprises,
  enterprisesMembers,
  memberPermissionsDefault,
  membersDepartments,
  users,
} from "../src/db/schema.js";
import { normalizeCpf } from "../src/modules/auth/password.js";

/** Mesmo valor que `BOOTSTRAP_SEED.adminCpf` em `scripts/seed-bootstrap.ts`. */
const BOOTSTRAP_ADMIN_CPF = "64079805187";

const DEPT_ADMIN_NAME = "Administrativo";

const SECOND_ENTERPRISE_SEED = {
  enterpriseLegalName: "Empresa Teste",
  enterpriseTradeName: "Empresa Teste",
  enterpriseCnpj: "15243294000173",
} as const;

async function ensureMemberPermissionsFromDepartments(params: {
  memberDepartmentIdsByDepartmentId: Map<string, string>;
  departmentIds: string[];
}): Promise<void> {
  const { memberDepartmentIdsByDepartmentId, departmentIds } = params;

  if (departmentIds.length === 0) {
    return;
  }

  const snapshotPermissions = await db
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

  for (const perm of snapshotPermissions) {
    const memberDepartmentId = memberDepartmentIdsByDepartmentId.get(
      perm.departmentId,
    );
    if (!memberDepartmentId) {
      continue;
    }

    const existing = await db
      .select({ id: memberPermissionsDefault.id })
      .from(memberPermissionsDefault)
      .where(
        and(
          eq(memberPermissionsDefault.memberDepartmentId, memberDepartmentId),
          eq(memberPermissionsDefault.permission, perm.permission),
          isNull(memberPermissionsDefault.deletedAt),
        ),
      )
      .limit(1);

    if (!existing[0]) {
      await db.insert(memberPermissionsDefault).values({
        memberDepartmentId,
        permission: perm.permission,
        status: perm.status,
      });
      console.log(
        `  Permissao de membro inserida (${perm.departmentId.slice(0, 8)}…): ${perm.permission}`,
      );
    }
  }
}

async function reconcileMainDepartment(params: {
  memberId: string;
  mainDepartmentId: string;
}): Promise<void> {
  const { memberId, mainDepartmentId } = params;

  const rows = await db
    .select({
      id: membersDepartments.id,
      departmentId: membersDepartments.departmentId,
      mainDepartment: membersDepartments.mainDepartment,
    })
    .from(membersDepartments)
    .where(
      and(
        eq(membersDepartments.memberId, memberId),
        isNull(membersDepartments.deletedAt),
      ),
    );

  for (const r of rows) {
    const shouldBeMain = r.departmentId === mainDepartmentId;
    if (r.mainDepartment !== shouldBeMain) {
      await db
        .update(membersDepartments)
        .set({ mainDepartment: shouldBeMain, updatedAt: new Date() })
        .where(eq(membersDepartments.id, r.id));
      console.log(
        `  main_department ajustado para o vinculo ${r.id} (principal=${shouldBeMain}).`,
      );
    }
  }
}

const seed = async (): Promise<void> => {
  const adminCpf = normalizeCpf(BOOTSTRAP_ADMIN_CPF);
  const entReg = normalizeCpf(SECOND_ENTERPRISE_SEED.enterpriseCnpj);
  const legalName = SECOND_ENTERPRISE_SEED.enterpriseLegalName;
  const tradeName = SECOND_ENTERPRISE_SEED.enterpriseTradeName;

  const deptRows = await db
    .select({ id: departments.id })
    .from(departments)
    .where(
      and(eq(departments.name, DEPT_ADMIN_NAME), isNull(departments.deletedAt)),
    )
    .limit(1);

  const departmentAdminId = deptRows[0]?.id;
  if (!departmentAdminId) {
    throw new Error(
      `Departamento "${DEPT_ADMIN_NAME}" nao encontrado. Execute antes: npm run seed:bootstrap`,
    );
  }

  const userRows = await db
    .select()
    .from(users)
    .where(and(eq(users.userRegistration, adminCpf), isNull(users.deletedAt)))
    .limit(1);

  const userRow = userRows[0];
  if (!userRow) {
    throw new Error(
      `Usuario com CPF ${adminCpf} nao encontrado. Execute antes: npm run seed:bootstrap`,
    );
  }

  const userId = userRow.id;

  let enterpriseId: string;

  const existingEnt = await db
    .select()
    .from(enterprises)
    .where(
      and(eq(enterprises.registration, entReg), isNull(enterprises.deletedAt)),
    )
    .limit(1);

  if (existingEnt[0]) {
    enterpriseId = existingEnt[0].id;
    console.log("Empresa secundaria seed ja existe:", enterpriseId);
  } else {
    const [ent] = await db
      .insert(enterprises)
      .values({
        registration: entReg,
        legalName,
        tradeName,
      })
      .returning();
    enterpriseId = ent!.id;
    console.log("Empresa secundaria criada:", enterpriseId);
  }

  const memExisting = await db
    .select()
    .from(enterprisesMembers)
    .where(
      and(
        eq(enterprisesMembers.userId, userId),
        eq(enterprisesMembers.enterpriseId, enterpriseId),
        isNull(enterprisesMembers.deletedAt),
      ),
    )
    .limit(1);

  const now = new Date();
  const departmentIds = [departmentAdminId];

  if (!memExisting[0]) {
    await db.transaction(async (tx) => {
      const [member] = await tx
        .insert(enterprisesMembers)
        .values({
          code: 1,
          userId,
          enterpriseId,
          class: "ADMINISTRADOR",
          includedBy: userId,
          approvedAt: now,
          status: "ATIVO",
        })
        .returning();

      const memberDepartmentsRows = await tx
        .insert(membersDepartments)
        .values([
          {
            memberId: member!.id,
            departmentId: departmentAdminId,
            mainDepartment: true,
          },
        ])
        .returning({
          id: membersDepartments.id,
          departmentId: membersDepartments.departmentId,
        });

      const memberDepartmentIdsByDepartmentId = new Map(
        memberDepartmentsRows.map((md) => [md.departmentId, md.id]),
      );

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
        const memberDepartmentId = memberDepartmentIdsByDepartmentId.get(
          perm.departmentId,
        );
        if (!memberDepartmentId) {
          throw new Error("Falha ao associar permissoes do departamento");
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
    });

    console.log(
      "Seed enterprise-switch: membro criado na segunda empresa com departamento principal e permissoes espelhadas.",
    );
  } else {
    const memberId = memExisting[0].id;
    console.log("Vinculo membro na segunda empresa ja existe:", memberId);

    const memberDepartmentIdsByDepartmentId = new Map<string, string>();

    for (const deptId of departmentIds) {
      const mdExisting = await db
        .select()
        .from(membersDepartments)
        .where(
          and(
            eq(membersDepartments.memberId, memberId),
            eq(membersDepartments.departmentId, deptId),
            isNull(membersDepartments.deletedAt),
          ),
        )
        .limit(1);

      if (mdExisting[0]) {
        memberDepartmentIdsByDepartmentId.set(deptId, mdExisting[0].id);
        console.log(`  Vinculo membro-departamento ja existe: ${deptId}`);
      } else {
        const [md] = await db
          .insert(membersDepartments)
          .values({
            memberId,
            departmentId: deptId,
            mainDepartment: false,
          })
          .returning();
        memberDepartmentIdsByDepartmentId.set(deptId, md!.id);
        console.log(`  Vinculo membro-departamento criado: ${deptId}`);
      }
    }

    await reconcileMainDepartment({
      memberId,
      mainDepartmentId: departmentAdminId,
    });

    await ensureMemberPermissionsFromDepartments({
      memberDepartmentIdsByDepartmentId,
      departmentIds,
    });

    console.log(
      "Seed enterprise-switch: vinculos e permissoes de membro conferidos/atualizados.",
    );
  }

  console.log(
    "Seed enterprise-switch-test concluido. O usuario admin agora possui duas empresas ativas.",
  );
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
