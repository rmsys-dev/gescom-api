import { and, eq, isNull, sql } from "drizzle-orm";
import { enterprisesSequences } from "../../db/schema.js";
const ensureSequenceRow = async (enterpriseId, type, tx) => {
    await tx
        .insert(enterprisesSequences)
        .values({ enterpriseId, type, sequence: 0 })
        .onConflictDoNothing({
        target: [enterprisesSequences.enterpriseId, enterprisesSequences.type],
        where: sql `${enterprisesSequences.deletedAt} is null`,
    });
};
export const nextEnterpriseSequence = async (enterpriseId, type, tx) => {
    await ensureSequenceRow(enterpriseId, type, tx);
    const [row] = await tx
        .update(enterprisesSequences)
        .set({
        sequence: sql `${enterprisesSequences.sequence} + 1`,
        updatedAt: sql `now()`,
    })
        .where(and(eq(enterprisesSequences.enterpriseId, enterpriseId), eq(enterprisesSequences.type, type), isNull(enterprisesSequences.deletedAt)))
        .returning({ sequence: enterprisesSequences.sequence });
    if (!row) {
        throw new Error(`Sequencia nao encontrada para empresa ${enterpriseId} e tipo ${type}`);
    }
    return row.sequence;
};
export const syncEnterpriseSequenceFloor = async (enterpriseId, type, floor, tx) => {
    await ensureSequenceRow(enterpriseId, type, tx);
    await tx
        .update(enterprisesSequences)
        .set({
        sequence: sql `greatest(${enterprisesSequences.sequence}, ${floor})`,
        updatedAt: sql `now()`,
    })
        .where(and(eq(enterprisesSequences.enterpriseId, enterpriseId), eq(enterprisesSequences.type, type), isNull(enterprisesSequences.deletedAt), sql `${enterprisesSequences.sequence} < ${floor}`));
};
