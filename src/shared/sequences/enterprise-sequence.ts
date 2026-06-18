import { and, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import type { SequenceType } from "../../db/enums.js";
import { enterprisesSequences } from "../../db/schema.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const ensureSequenceRow = async (
  enterpriseId: string,
  type: SequenceType,
  tx: Tx,
): Promise<void> => {
  await tx
    .insert(enterprisesSequences)
    .values({ enterpriseId, type, sequence: 0 })
    .onConflictDoNothing({
      target: [enterprisesSequences.enterpriseId, enterprisesSequences.type],
    });
};

export const nextEnterpriseSequence = async (
  enterpriseId: string,
  type: SequenceType,
  tx: Tx,
): Promise<number> => {
  await ensureSequenceRow(enterpriseId, type, tx);

  const [row] = await tx
    .update(enterprisesSequences)
    .set({
      sequence: sql`${enterprisesSequences.sequence} + 1`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(enterprisesSequences.enterpriseId, enterpriseId),
        eq(enterprisesSequences.type, type),
        isNull(enterprisesSequences.deletedAt),
      ),
    )
    .returning({ sequence: enterprisesSequences.sequence });

  if (!row) {
    throw new Error(
      `Sequencia nao encontrada para empresa ${enterpriseId} e tipo ${type}`,
    );
  }

  return row.sequence;
};

export const syncEnterpriseSequenceFloor = async (
  enterpriseId: string,
  type: SequenceType,
  floor: number,
  tx: Tx,
): Promise<void> => {
  await ensureSequenceRow(enterpriseId, type, tx);

  await tx
    .update(enterprisesSequences)
    .set({
      sequence: sql`greatest(${enterprisesSequences.sequence}, ${floor})`,
      updatedAt: sql`now()`,
    })
    .where(
      and(
        eq(enterprisesSequences.enterpriseId, enterpriseId),
        eq(enterprisesSequences.type, type),
        isNull(enterprisesSequences.deletedAt),
        sql`${enterprisesSequences.sequence} < ${floor}`,
      ),
    );
};
