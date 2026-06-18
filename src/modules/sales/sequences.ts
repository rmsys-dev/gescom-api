import { and, eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import type { SequenceType } from "../../db/enums.js";
import { sales } from "../../db/schema.js";
import { ConflictError } from "../../shared/errors/app-error.js";
import {
  nextEnterpriseSequence,
  syncEnterpriseSequenceFloor,
} from "../../shared/sequences/enterprise-sequence.js";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

const SALE_ORDER_DOCUMENT_TYPE = "VENDA" satisfies SequenceType;

/** Próximo número de pedido (VENDA e ORÇAMENTO compartilham o contador VENDA). */
export async function nextSaleOrderNumber(
  enterpriseId: string,
  tx: Tx,
): Promise<number> {
  return nextEnterpriseSequence(enterpriseId, SALE_ORDER_DOCUMENT_TYPE, tx);
}

export async function assertSaleOrderNumberAvailable(
  enterpriseId: string,
  orderNumber: number,
  tx: Tx,
): Promise<void> {
  const existing = await tx
    .select({ id: sales.id })
    .from(sales)
    .where(
      and(
        eq(sales.enterprisesId, enterpriseId),
        eq(sales.orderNumber, orderNumber),
      ),
    )
    .limit(1);

  if (existing[0]) {
    throw new ConflictError(
      "Venda em conflito (numero do pedido)",
      "SALE_CONFLICT",
    );
  }
}

/** Ajusta o piso da sequência quando o número do pedido é informado manualmente. */
export async function syncSaleOrderSequenceFloor(
  enterpriseId: string,
  orderNumber: number,
  tx: Tx,
): Promise<void> {
  return syncEnterpriseSequenceFloor(
    enterpriseId,
    SALE_ORDER_DOCUMENT_TYPE,
    orderNumber,
    tx,
  );
}
