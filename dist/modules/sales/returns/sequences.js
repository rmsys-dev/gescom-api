import { eq, sql } from "drizzle-orm";
import { salesReturns } from "../../../db/schema.js";
export async function nextSaleReturnOrder(saleId, tx) {
    const maxRows = await tx
        .select({
        max: sql `coalesce(max(${salesReturns.returnOrder}), 0)`,
    })
        .from(salesReturns)
        .where(eq(salesReturns.salesId, saleId));
    return Number(maxRows[0]?.max ?? 0) + 1;
}
