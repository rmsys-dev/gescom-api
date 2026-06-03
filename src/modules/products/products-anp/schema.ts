import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listProductsAnpQuerySchema = createPaginationQuerySchema(100);

const anpCodeSchema = z
  .string()
  .trim()
  .length(9, "ANP deve ter exatamente 9 caracteres")

export const createProductsAnpSchema = z
  .object({
    anp: anpCodeSchema,
    description: z.string().trim().min(1).max(255).toUpperCase(),
  })
  .strict();

export const patchProductsAnpSchema = z
  .object({
    anp: anpCodeSchema.optional(),
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.anp !== undefined ||
      data.description !== undefined ||
    "Deve haver ao menos um campo para atualizar",
  );

export const productsAnpParamsSchema = z
  .object({
    productsAnpId: z
      .string()
      .uuid("Campo 'productsAnpId' deve ser um UUID valido"),
  })
  .strict();

export type ListProductsAnpQuery = z.infer<typeof listProductsAnpQuerySchema>;
export type CreateProductsAnpInput = z.infer<typeof createProductsAnpSchema>;
export type PatchProductsAnpInput = z.infer<typeof patchProductsAnpSchema>;
export type ProductsAnpParams = z.infer<typeof productsAnpParamsSchema>;
