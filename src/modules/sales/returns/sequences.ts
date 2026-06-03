import { eq, sql } from "drizzle-orm";
import { salesReturns } from "../../../db/schema.js";

type Tx = Parameters<
  Parameters<typeof import("../../../db/index.js").db.transaction>[0]
>[0];

export async function nextSaleReturnNumber(
  enterpriseId: string,
  tx: Tx,
): Promise<number> {
  const maxRows = await tx
    .select({
      max: sql<number>`coalesce(max(${salesReturns.returnNumber}), 0)`,
    })
    .from(salesReturns)
    .where(eq(salesReturns.enterprisesId, enterpriseId));
  return Number(maxRows[0]?.max ?? 0) + 1;
}
