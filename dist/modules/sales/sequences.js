import { and, eq } from "drizzle-orm";
import { sales } from "../../db/schema.js";
import { ConflictError } from "../../shared/errors/app-error.js";
import { nextEnterpriseSequence, syncEnterpriseSequenceFloor, } from "../../shared/sequences/enterprise-sequence.js";
const SALE_ORDER_DOCUMENT_TYPE = "VENDA";
/**
 * Próximo número de pedido.
 * VENDA, ORÇAMENTO e ORDEM DE SERVICO compartilham o contador `VENDA`.
 */
export async function nextSaleOrderNumber(enterpriseId, tx) {
    return nextEnterpriseSequence(enterpriseId, SALE_ORDER_DOCUMENT_TYPE, tx);
}
export async function assertSaleOrderNumberAvailable(enterpriseId, orderNumber, tx) {
    const existing = await tx
        .select({ id: sales.id })
        .from(sales)
        .where(and(eq(sales.enterprisesId, enterpriseId), eq(sales.orderNumber, orderNumber)))
        .limit(1);
    if (existing[0]) {
        throw new ConflictError("Venda em conflito (numero do pedido)", "SALE_CONFLICT");
    }
}
/** Ajusta o piso da sequência quando o número do pedido é informado manualmente. */
export async function syncSaleOrderSequenceFloor(enterpriseId, orderNumber, tx) {
    return syncEnterpriseSequenceFloor(enterpriseId, SALE_ORDER_DOCUMENT_TYPE, orderNumber, tx);
}
