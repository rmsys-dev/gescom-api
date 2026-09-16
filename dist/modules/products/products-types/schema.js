import { z } from "zod";
import { catalogListQueryBase } from "../shared/catalog-list-query.js";
export const listTypesProductsQuerySchema = z
    .object({
    ...catalogListQueryBase,
})
    .strict();
export const typeProductParamsSchema = z
    .object({
    typeProductId: z
        .string()
        .uuid("Campo 'typeProductId' deve ser um UUID valido"),
})
    .strict();
