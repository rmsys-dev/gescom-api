import { and, eq, gte, isNull, lte } from "drizzle-orm";
import { db } from "../../db/index.js";
import type { SequenceType } from "../../db/enums.js";
import { nfeEvents, nfeHeaders } from "../../db/schema.js";
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

/** Faixa homologada na SEFAZ (cStat 102) que contém o número. */
async function inutilizedRangeCovering(
  enterpriseId: string,
  mod: NfeSequenceModel,
  serie: string,
  nNf: number,
  tx: Tx,
) {
  const [range] = await tx
    .select({ nNfIni: nfeEvents.nNfIni, nNfFin: nfeEvents.nNfFin })
    .from(nfeEvents)
    .where(
      and(
        eq(nfeEvents.enterpriseId, enterpriseId),
        eq(nfeEvents.eventType, "INUTILIZACAO"),
        eq(nfeEvents.cStat, "102"),
        eq(nfeEvents.mod, mod),
        eq(nfeEvents.serie, serie),
        lte(nfeEvents.nNfIni, nNf),
        gte(nfeEvents.nNfFin, nNf),
      ),
    )
    .limit(1);
  return range;
}

/** Próximo número da nota própria em enterprises_sequences, pulando faixas inutilizadas da série. */
export async function nextNfeNumber(
  enterpriseId: string,
  mod: NfeSequenceModel,
  tx: Tx,
  serie?: string,
): Promise<number> {
  for (;;) {
    const nNf = await nextEnterpriseSequence(enterpriseId, nfeSequenceType(mod), tx);
    if (serie === undefined) return nNf;
    const range = await inutilizedRangeCovering(enterpriseId, mod, serie, nNf, tx);
    if (!range?.nNfFin) return nNf;
    await syncNfeSequenceFloor(enterpriseId, mod, range.nNfFin, tx);
  }
}

export async function assertNfeNumberAvailable(
  enterpriseId: string,
  mod: NfeSequenceModel,
  nNf: number,
  tx: Tx,
  serie?: string,
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

  if (serie !== undefined) {
    const range = await inutilizedRangeCovering(enterpriseId, mod, serie, nNf, tx);
    if (range) {
      throw new ConflictError(
        `O numero ${nNf} esta na faixa inutilizada ${range.nNfIni}-${range.nNfFin}`,
        "NFE_NUMBER_INUTILIZED",
      );
    }
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
