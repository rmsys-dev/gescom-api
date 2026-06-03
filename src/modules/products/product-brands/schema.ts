import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listProductBrandsQuerySchema = createPaginationQuerySchema(100);

export const createProductBrandSchema = z
  .object({
    description: z.string().trim().min(1).max(255).toUpperCase(),
  })
  .strict();

export const patchProductBrandSchema = z
  .object({
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
  })
  .strict()
  .refine(
    (data) => data.description !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const productBrandParamsSchema = z
  .object({
    productBrandId: z
      .string()
      .uuid("Campo 'productBrandId' deve ser um UUID valido"),
  })
  .strict();

export type ListProductBrandsQuery = z.infer<typeof listProductBrandsQuerySchema>;
export type CreateProductBrandInput = z.infer<typeof createProductBrandSchema>;
export type PatchProductBrandInput = z.infer<typeof patchProductBrandSchema>;
