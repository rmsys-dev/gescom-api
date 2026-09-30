import { and, eq, isNull } from "drizzle-orm";
import { db } from "../../db/index.js";
import type { SequenceType } from "../../db/enums.js";
import { nfeHeaders } from "../../db/schema.js";
import { ConflictError } from "../../shared/errors/app-error.js";
import {
  nextEnterpriseSequence,
  syncEnterpriseSequenceFloor,
} from "../../shared/sequences/enterprise-sequence.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type NfeSequenceModel = "55" | "65";

/** Modelo 55 usa o contador NFE; modelo 65 usa o contador NFCE. */
export const nfeSequenceType = (mod: NfeSequenceModel): SequenceType =>
  mod === "65" ? "NFCE" : "NFE";

/** Próximo número da nota própria em enterprises_sequences. */
export async function nextNfeNumber(
  enterpriseId: string,
  mod: NfeSequenceModel,
  tx: Tx,
): Promise<number> {
  return nextEnterpriseSequence(enterpriseId, nfeSequenceType(mod), tx);
}

export async function assertNfeNumberAvailable(
  enterpriseId: string,
  mod: NfeSequenceModel,
  nNf: number,
  tx: Tx,
): Promise<void> {
  const existing = await tx
    .select({ id: nfeHeaders.id })
    .from(nfeHeaders)
    .where(
      and(
        eq(nfeHeaders.enterpriseId, enterpriseId),
        eq(nfeHeaders.mod, mod),
        eq(nfeHeaders.nNf, nNf),
        eq(nfeHeaders.issuanceType, "PROPRIA"),
        isNull(nfeHeaders.deletedAt),
      ),
    )
    .limit(1);

  if (existing[0]) {
    throw new ConflictError(
      "Nota fiscal em conflito (numero da nota)",
      "NFE_NUMBER_CONFLICT",
    );
  }
}

/** Ajusta o piso da sequência quando o número da nota é informado manualmente. */
export async function syncNfeSequenceFloor(
  enterpriseId: string,
  mod: NfeSequenceModel,
  nNf: number,
  tx: Tx,
): Promise<void> {
  return syncEnterpriseSequenceFloor(
    enterpriseId,
    nfeSequenceType(mod),
    nNf,
    tx,
  );
}
