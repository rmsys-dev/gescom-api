import { and, eq, inArray, isNull } from "drizzle-orm";
import { db } from "../../../src/db/index.js";
import {
  departmentDefaultPermissions,
  departments,
  memberPermissionsDefault,
  membersDepartments,
} from "../../../src/db/schema.js";
import {
  getPermissionsForReference,
  type PermissionReference,
} from "../../../src/modules/auth/default-permissions.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

async function replaceDepartmentDefaultPermissions(
  departmentId: string,
  ref: PermissionReference,
  tx: Tx,
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
}

export async function ensureDepartment(params: {
  name: string;
  description: string;
  permissionReference: PermissionReference;
}): Promise<string> {
  const { name, description, permissionReference } = params;

  const existing = await db
    .select()
    .from(departments)
    .where(and(eq(departments.name, name), isNull(departments.deletedAt)))
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

export async function ensureMemberPermissionsFromDepartments(params: {
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
    }
  }
}

export async function ensureMemberDepartmentLink(params: {
  memberId: string;
  departmentId: string;
  mainDepartment: boolean;
}): Promise<string> {
  const { memberId, departmentId, mainDepartment } = params;

  const mdExisting = await db
    .select()
    .from(membersDepartments)
    .where(
      and(
        eq(membersDepartments.memberId, memberId),
        eq(membersDepartments.departmentId, departmentId),
        isNull(membersDepartments.deletedAt),
      ),
    )
    .limit(1);

  if (mdExisting[0]) {
    if (mdExisting[0].mainDepartment !== mainDepartment) {
      await db
        .update(membersDepartments)
        .set({ mainDepartment, updatedAt: new Date() })
        .where(eq(membersDepartments.id, mdExisting[0].id));
    }
    return mdExisting[0].id;
  }

  const [md] = await db
    .insert(membersDepartments)
    .values({
      memberId,
      departmentId,
      mainDepartment,
    })
    .returning();

  return md!.id;
}
