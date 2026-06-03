import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { productTypes } from "../../db/schema.js";

/** Código do tipo de produto classificado como serviço (NBS obrigatório). */
export const PRODUCT_TYPE_SERVICE_CODE = "09";

export const getProductTypeCode = async (
  productTypeId: string,
): Promise<string | null> => {
  const rows = await db
    .select({ type: productTypes.type })
    .from(productTypes)
    .where(eq(productTypes.id, productTypeId))
    .limit(1);
  return rows[0]?.type ?? null;
};

export const isServiceProductType = (typeCode: string): boolean =>
  typeCode === PRODUCT_TYPE_SERVICE_CODE;
