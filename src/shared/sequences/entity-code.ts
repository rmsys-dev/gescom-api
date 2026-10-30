import type { db } from "../../db/index.js";
import type { SequenceType } from "../../db/enums.js";
import {
  nextEnterpriseSequence,
  syncEnterpriseSequenceFloor,
} from "./enterprise-sequence.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const MAX_ATTEMPTS = 50;

/**
 * Código informado sobe o piso da sequência; sem código, usa o próximo da
 * sequência pulando números já gravados manualmente.
 */
export async function resolveEntityCode(input: {
  enterpriseId: string;
  type: Extract<SequenceType, "MEMBRO" | "PRODUTO">;
  informed: number | null | undefined;
  isTaken: (code: number) => Promise<boolean>;
  tx: Tx;
}): Promise<number> {
  if (input.informed !== null && input.informed !== undefined) {
    await syncEnterpriseSequenceFloor(
      input.enterpriseId,
      input.type,
      input.informed,
      input.tx,
    );
    return input.informed;
  }
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const code = await nextEnterpriseSequence(
      input.enterpriseId,
      input.type,
      input.tx,
    );
    if (!(await input.isTaken(code))) {
      return code;
    }
  }
  throw new Error(
    `Nao foi possivel gerar codigo livre (${input.type}) para a empresa ${input.enterpriseId}`,
  );
}
