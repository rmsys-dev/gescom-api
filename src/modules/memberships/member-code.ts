import { and, eq, isNull, ne } from "drizzle-orm";
import { db, enterprisesMembers } from "../../db/schema.js";
import { resolveEntityCode } from "../../shared/sequences/entity-code.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function isMemberCodeTaken(
  client: typeof db | Tx,
  enterpriseId: string,
  code: number,
  exceptMemberId?: string,
): Promise<boolean> {
  const filters = [
    eq(enterprisesMembers.enterpriseId, enterpriseId),
    eq(enterprisesMembers.code, code),
    isNull(enterprisesMembers.deletedAt),
  ];
  if (exceptMemberId) {
    filters.push(ne(enterprisesMembers.id, exceptMemberId));
  }
  const [found] = await client
    .select({ id: enterprisesMembers.id })
    .from(enterprisesMembers)
    .where(and(...filters))
    .limit(1);
  return Boolean(found);
}

/** Código do JSON ou próximo da sequência MEMBRO da empresa. */
export const resolveMemberCode = (
  enterpriseId: string,
  informed: number | null | undefined,
  tx: Tx,
): Promise<number> =>
  resolveEntityCode({
    enterpriseId,
    type: "MEMBRO",
    informed,
    isTaken: (code) => isMemberCodeTaken(tx, enterpriseId, code),
    tx,
  });
