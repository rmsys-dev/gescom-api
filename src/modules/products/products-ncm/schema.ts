import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listProductsNcmQuerySchema = createPaginationQuerySchema(100);

const ncmCodeSchema = z
  .string()
  .trim()
  .length(8, "NCM deve ter exatamente 8 caracteres");

export const createProductsNcmSchema = z
  .object({
    ncm: ncmCodeSchema,
    description: z.string().trim().min(1).max(255).toUpperCase(),
  })
  .strict();

export const patchProductsNcmSchema = z
  .object({
    ncm: ncmCodeSchema.optional(),
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.ncm !== undefined ||
      data.description !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const productsNcmParamsSchema = z
  .object({
    productsNcmId: z
      .string()
      .uuid("Campo 'productsNcmId' deve ser um UUID valido"),
  })
  .strict();

export type ListProductsNcmQuery = z.infer<typeof listProductsNcmQuerySchema>;
export type CreateProductsNcmInput = z.infer<typeof createProductsNcmSchema>;
export type PatchProductsNcmInput = z.infer<typeof patchProductsNcmSchema>;
export type ProductsNcmParams = z.infer<typeof productsNcmParamsSchema>;
