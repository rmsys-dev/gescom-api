/**
 * Seed idempotente da estrutura inicial:
 * - Departamento global com `permission_reference` e snapshot em `department_default_permissions`
 *   (catálogo em `src/modules/auth/default-permissions.ts`).
 * - Uma empresa.
 * - Um usuário admin com credenciais EMAIL e CPF.
 * - Vínculo membro–empresa (`ADMINISTRADOR`), associação ao departamento principal e
 *   permissões de membro espelhadas a partir do snapshot do departamento.
 *
 * Uso: `npm run seed:bootstrap` ou `npx tsx scripts/seed-bootstrap.ts`
 *
 * Dados do admin/empresa estão em `BOOTSTRAP_SEED` (não use variáveis SEED_* no .env).
 * O script ainda carrega `.env` para `DATABASE_URL` e demais variáveis exigidas por
 * `hashPassword` / `src/config/env.ts`. Ver `docs/documentações_de_scripts/seed-bootstrap.md`.
 *
 * Observação: o catálogo de `permission_reference` em
 * `src/modules/auth/default-permissions.ts` hoje expõe apenas `administrador`.
 * Quando novas referências forem adicionadas, basta replicar o `ensureDepartment(...)`
 * abaixo para criar outros departamentos globais no seed.
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
  usersCredentials,
} from "../src/db/schema.js";
import {
  getPermissionsForReference,
  type PermissionReference,
} from "../src/modules/auth/default-permissions.js";
import { hashPassword, normalizeCpf } from "../src/modules/auth/password.js";

/** Credenciais e empresa criadas/atualizadas pelo seed (editar aqui se necessário). */
const BOOTSTRAP_SEED = {
  adminPassword: "martins@2395",
  adminCpf: "03747547133",
  adminEmail: "leomir.rmsys@gmail.com",
  adminPhone: "64992214800",
  adminName: "Leomir Dias",
  enterpriseLegalName: "RMsys Informática",
  enterpriseTradeName: "RMsys",
  enterpriseCnpj: "00000000000191",
} as const;

const DEPT_ADMIN_NAME = "Administrativo";
const DEPT_ADMIN_REF: PermissionReference = "administrador";

async function replaceDepartmentDefaultPermissions(
  departmentId: string,
  ref: PermissionReference,
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<void> {
  const now = new Date();
  await tx
    .update(departmentDefaultPermissions)
    .set({ deletedAt: now, updatedAt: now })
    .where(
      and(
        eq(departmentDefaultPermissions.departmentId, departmentId),
        isNull(departmentDefaultPermissions.deletedAt),
      ),
    );

  const perms = getPermissionsForReference(ref);
  if (perms.length > 0) {
    await tx.insert(departmentDefaultPermissions).values(
      perms.map((permission) => ({
        departmentId,
        permission,
        status: "ALLOW" as const,
      })),
    );
  }
}

async function ensureDepartmentSnapshotIfMissing(
  departmentId: string,
  ref: PermissionReference,
): Promise<void> {
  const existingSnap = await db
    .select({ id: departmentDefaultPermissions.id })
    .from(departmentDefaultPermissions)
    .where(
      and(
        eq(departmentDefaultPermissions.departmentId, departmentId),
        isNull(departmentDefaultPermissions.deletedAt),
      ),
    )
    .limit(1);

  if (existingSnap[0]) {
    return;
  }

  const perms = getPermissionsForReference(ref);
  if (perms.length === 0) {
    console.warn(
      `Sem permissoes no catalogo para ref ${ref}; departamento ${departmentId} sem snapshot.`,
    );
    return;
  }

  await db.insert(departmentDefaultPermissions).values(
    perms.map((permission) => ({
      departmentId,
      permission,
      status: "ALLOW" as const,
    })),
  );
  console.log(
    `Snapshot department_default_permissions criado para departamento ${departmentId} (${perms.length} permissoes).`,
  );
}

async function ensureDepartment(params: {
  name: string;
  description: string;
  permissionReference: PermissionReference;
}): Promise<string> {
  const { name, description, permissionReference } = params;

  const existing = await db
    .select()
    .from(departments)
    .where(
      and(eq(departments.name, name), isNull(departments.deletedAt)),
    )
    .limit(1);

  if (existing[0]) {
    let row = existing[0];
    if (row.permissionReference !== permissionReference) {
      await db.transaction(async (tx) => {
        await tx
          .update(departments)
          .set({
            permissionReference,
            description: description.trim(),
            updatedAt: new Date(),
          })
          .where(eq(departments.id, row.id));
        await replaceDepartmentDefaultPermissions(
          row.id,
          permissionReference,
          tx,
        );
      });
      row = { ...row, permissionReference };
      console.log(
        `Departamento [${name}] atualizado com permission_reference e snapshot.`,
      );
    } else {
      console.log(`Departamento [${name}] ja existe:`, row.id);
    }

    await ensureDepartmentSnapshotIfMissing(row.id, permissionReference);
    return row.id;
  }

  const [created] = await db.transaction(async (tx) => {
    const [row] = await tx
      .insert(departments)
      .values({
        name,
        description: description.trim(),
        permissionReference,
      })
      .returning();

    if (!row) {
      throw new Error(`Falha ao criar departamento ${name}`);
    }

    const perms = getPermissionsForReference(permissionReference);
    if (perms.length > 0) {
      await tx.insert(departmentDefaultPermissions).values(
        perms.map((permission) => ({
          departmentId: row.id,
          permission,
          status: "ALLOW" as const,
        })),
      );
    }

    return [row] as const;
  });

  console.log(`Departamento criado [${name}]:`, created!.id);
  return created!.id;
}

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

export const runBootstrapSeed = async (): Promise<void> => {
  const adminCpf = normalizeCpf(BOOTSTRAP_SEED.adminCpf);
  const adminEmail = BOOTSTRAP_SEED.adminEmail;
  const adminPhone = BOOTSTRAP_SEED.adminPhone;
  const adminName = BOOTSTRAP_SEED.adminName;
  const adminPassword = BOOTSTRAP_SEED.adminPassword;
  if (adminPassword.length < 8) {
    throw new Error(
      "BOOTSTRAP_SEED.adminPassword deve ter ao menos 8 caracteres.",
    );
  }

  const entReg = normalizeCpf(BOOTSTRAP_SEED.enterpriseCnpj);
  const legalName = BOOTSTRAP_SEED.enterpriseLegalName;
  const tradeName = BOOTSTRAP_SEED.enterpriseTradeName;

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
    console.log("Empresa seed ja existe:", enterpriseId);
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
    console.log("Empresa criada:", enterpriseId);
  }

  let userId: string;

  const existingUser = await db
    .select()
    .from(users)
    .where(and(eq(users.userRegistration, adminCpf), isNull(users.deletedAt)))
    .limit(1);

  if (existingUser[0]) {
    userId = existingUser[0].id;
    console.log("Usuario admin ja existe:", userId);
  } else {
    const [u] = await db
      .insert(users)
      .values({
        userName: adminName,
        userRegistration: adminCpf,
        userEmail: adminEmail.trim().toLowerCase(),
        userPhone: adminPhone.trim(),
        onboardingCompleted: false,
      })
      .returning();
    userId = u!.id;
    console.log("Usuario criado:", userId);
  }

  const passwordHash = await hashPassword(adminPassword);
  const emailNorm = adminEmail.trim().toLowerCase();

  const credEmail = await db
    .select()
    .from(usersCredentials)
    .where(
      and(
        eq(usersCredentials.userId, userId),
        eq(usersCredentials.loginType, "EMAIL"),
        isNull(usersCredentials.deletedAt),
      ),
    )
    .limit(1);

  if (!credEmail[0]) {
    await db.insert(usersCredentials).values({
      userId,
      loginType: "EMAIL",
      login: adminEmail.trim(),
      loginNormalized: emailNorm,
      password: passwordHash,
    });
    console.log("Credencial EMAIL criada.");
  }

  const credCpf = await db
    .select()
    .from(usersCredentials)
    .where(
      and(
        eq(usersCredentials.userId, userId),
        eq(usersCredentials.loginType, "CPF"),
        isNull(usersCredentials.deletedAt),
      ),
    )
    .limit(1);

  if (!credCpf[0]) {
    await db.insert(usersCredentials).values({
      userId,
      loginType: "CPF",
      login: adminCpf,
      loginNormalized: adminCpf,
      password: passwordHash,
    });
    console.log("Credencial CPF criada.");
  }

  const departmentAdminId = await ensureDepartment({
    name: DEPT_ADMIN_NAME,
    description: "Departamento padrao seed (ref administrador)",
    permissionReference: DEPT_ADMIN_REF,
  });

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
      "Bootstrap: membro criado com departamento principal e permissoes espelhadas.",
    );
  } else {
    const memberId = memExisting[0].id;
    console.log("Vinculo membro ja existe:", memberId);

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
      "Bootstrap: vinculos e permissoes de membro conferidos/atualizados.",
    );
  }

  console.log("Seed bootstrap concluido.");
};

const isDirectRun =
  process.argv[1]?.replace(/\\/g, "/").endsWith("scripts/seed-bootstrap.ts") ??
  false;

if (isDirectRun) {
  runBootstrapSeed().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
