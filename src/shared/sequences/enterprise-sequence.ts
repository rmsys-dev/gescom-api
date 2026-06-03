import { and, eq, isNull, like, sql } from "drizzle-orm";
import { db } from "../../db/index.js";
import { enterprisesSequences, sales } from "../../db/schema.js";

export type EnterpriseDocumentType = "PEDIDO_VENDA";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const counterSequenceValue = (
  documentType: EnterpriseDocumentType,
  value: number,
): string => `${documentType}:${value}`;

const parseCounterValue = (sequence: string): number | null => {
  const idx = sequence.lastIndexOf(":");
  if (idx < 0) {
    return null;
  }
  const parsed = Number.parseInt(sequence.slice(idx + 1), 10);
  return Number.isFinite(parsed) ? parsed : null;
};

const maxSaleOrderNumber = async (
  enterpriseId: string,
  tx: Tx,
): Promise<number> => {
  const rows = await tx
    .select({
      max: sql<number>`coalesce(max(${sales.orderNumber}), 0)`,
    })
    .from(sales)
    .where(eq(sales.enterprisesId, enterpriseId));
  return Number(rows[0]?.max ?? 0);
};

const maxCounterFromSequences = async (
  enterpriseId: string,
  documentType: EnterpriseDocumentType,
  tx: Tx,
): Promise<number> => {
  const rows = await tx
    .select({ sequence: enterprisesSequences.sequence })
    .from(enterprisesSequences)
    .where(
      and(
        eq(enterprisesSequences.enterpriseId, enterpriseId),
        like(enterprisesSequences.sequence, `${documentType}:%`),
        isNull(enterprisesSequences.deletedAt),
      ),
    );

  let max = 0;
  for (const row of rows) {
    const value = parseCounterValue(row.sequence);
    if (value !== null && value > max) {
      max = value;
    }
  }
  return max;
};

export const nextEnterpriseSequence = async (
  enterpriseId: string,
  documentType: EnterpriseDocumentType,
  tx: Tx,
): Promise<number> => {
  if (documentType !== "PEDIDO_VENDA") {
    throw new Error(`Tipo de documento nao suportado: ${documentType}`);
  }

  const [fromSales, fromSequences] = await Promise.all([
    maxSaleOrderNumber(enterpriseId, tx),
    maxCounterFromSequences(enterpriseId, documentType, tx),
  ]);

  return Math.max(fromSales, fromSequences) + 1;
};

export const syncEnterpriseSequenceFloor = async (
  enterpriseId: string,
  documentType: EnterpriseDocumentType,
  floor: number,
  tx: Tx,
): Promise<void> => {
  if (documentType !== "PEDIDO_VENDA") {
    throw new Error(`Tipo de documento nao suportado: ${documentType}`);
  }

  const current = await maxCounterFromSequences(
    enterpriseId,
    documentType,
    tx,
  );
  if (floor <= current) {
    return;
  }

  await tx.insert(enterprisesSequences).values({
    enterpriseId,
    sequence: counterSequenceValue(documentType, floor),
  });
};
