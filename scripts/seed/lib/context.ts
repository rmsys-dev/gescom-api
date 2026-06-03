import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../../src/db/index.js";
import { departments, enterprises, users } from "../../../src/db/schema.js";
import { normalizeCpf } from "../../../src/modules/auth/password.js";
import {
  BOOTSTRAP_ADMIN_CPF,
  BOOTSTRAP_ENTERPRISE_CNPJ,
} from "./constants.js";

export type BootstrapContext = {
  enterpriseId: string;
  adminUserId: string;
  departmentIds: Map<string, string>;
};

export async function resolveBootstrapContext(): Promise<BootstrapContext> {
  const entReg = normalizeCpf(BOOTSTRAP_ENTERPRISE_CNPJ);
  const adminCpf = normalizeCpf(BOOTSTRAP_ADMIN_CPF);

  const entRows = await db
    .select({ id: enterprises.id })
    .from(enterprises)
    .where(
      and(eq(enterprises.registration, entReg), isNull(enterprises.deletedAt)),
    )
    .limit(1);

  const enterpriseId = entRows[0]?.id;
  if (!enterpriseId) {
    throw new Error(
      "Empresa bootstrap nao encontrada. Execute antes: npm run seed:bootstrap",
    );
  }

  const userRows = await db
    .select({ id: users.id })
    .from(users)
    .where(and(eq(users.userRegistration, adminCpf), isNull(users.deletedAt)))
    .limit(1);

  const adminUserId = userRows[0]?.id;
  if (!adminUserId) {
    throw new Error(
      "Usuario admin bootstrap nao encontrado. Execute antes: npm run seed:bootstrap",
    );
  }

  const deptRows = await db
    .select({ id: departments.id, name: departments.name })
    .from(departments)
    .where(isNull(departments.deletedAt));

  const departmentIds = new Map(deptRows.map((d) => [d.name, d.id]));

  return { enterpriseId, adminUserId, departmentIds };
}
