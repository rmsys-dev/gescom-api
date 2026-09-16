import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";
export const listProductApplicationsQuerySchema = createPaginationQuerySchema(100);
export const createProductApplicationSchema = z
    .object({
    description: z.string().trim().min(1).max(255),
    productsEnterprisesId: z
        .string()
        .uuid("Campo 'productsEnterprisesId' deve ser um UUID valido"),
})
    .strict();
export const patchProductApplicationSchema = z
    .object({
    description: z.string().trim().min(1).max(255).optional(),
    productsEnterprisesId: z
        .string()
        .uuid("Campo 'productsEnterprisesId' deve ser um UUID valido")
        .optional(),
})
    .strict()
    .refine((data) => data.description !== undefined ||
    data.productsEnterprisesId !== undefined, "Deve haver ao menos um campo para atualizar");
export const productApplicationParamsSchema = z
    .object({
    id: z.string().uuid("Campo 'id' deve ser um UUID valido"),
})
    .strict();
