import "dotenv/config";
import { isNull } from "drizzle-orm";
import { db } from "../../src/db/index.js";
import { departments } from "../../src/db/schema.js";
import {
  isPermissionReference,
  type PermissionReference,
} from "../../src/modules/auth/default-permissions.js";
import { syncDepartmentPermissionGaps } from "../seed/lib/department-helpers.js";

/**
 * Sync aditivo: permissões novas do catálogo TypeScript →
 * department_default_permissions + member_permissions_default dos vínculos ativos.
 *
 * Uso: npx tsx scripts/db/sync-department-permission-catalog.ts
 */
async function main(): Promise<void> {
  const depts = await db
    .select({
      id: departments.id,
      name: departments.name,
      permissionReference: departments.permissionReference,
    })
    .from(departments)
    .where(isNull(departments.deletedAt));

  let totalDeptInserted = 0;
  let totalMemberInserted = 0;
  let syncedDepartments = 0;

  for (const dept of depts) {
    if (!isPermissionReference(dept.permissionReference)) {
      console.warn(
        `Ignorando departamento [${dept.name}] com permission_reference desconhecida: ${dept.permissionReference}`,
      );
      continue;
    }

    const ref = dept.permissionReference as PermissionReference;
    const result = await syncDepartmentPermissionGaps(dept.id, ref);
    syncedDepartments += 1;
    totalDeptInserted += result.deptInserted;
    totalMemberInserted += result.memberInserted;

    console.log(
      `[${dept.name}] ref=${ref} deptInserted=${result.deptInserted} memberInserted=${result.memberInserted}`,
    );
  }

  console.log(
    `Sync concluido: departamentos=${syncedDepartments} deptInserted=${totalDeptInserted} memberInserted=${totalMemberInserted}`,
  );
}

main()  
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
