import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";
export const listProductsAnpQuerySchema = createPaginationQuerySchema(100);
export const productsAnpParamsSchema = z
    .object({
    productsAnpId: z
        .string()
        .uuid("Campo 'productsAnpId' deve ser um UUID valido"),
})
    .strict();
