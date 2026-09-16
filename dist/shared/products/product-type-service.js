import { eq } from "drizzle-orm";
import { db } from "../../db/index.js";
import { productTypes } from "../../db/schema.js";
/** Código do tipo de produto classificado como serviço (NBS obrigatório). */
export const PRODUCT_TYPE_SERVICE_CODE = "09";
export const getProductTypeCode = async (productTypeId) => {
    const rows = await db
        .select({ type: productTypes.type })
        .from(productTypes)
        .where(eq(productTypes.id, productTypeId))
        .limit(1);
    return rows[0]?.type ?? null;
};
export const isServiceProductType = (typeCode) => typeCode === PRODUCT_TYPE_SERVICE_CODE;
/** Resolve o código do tipo pelo UUID e indica se é serviço (09). */
export const isServiceProductTypeById = async (productTypeId) => {
    const typeCode = await getProductTypeCode(productTypeId);
    return typeCode !== null && isServiceProductType(typeCode);
};
