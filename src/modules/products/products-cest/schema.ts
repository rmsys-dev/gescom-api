import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listProductsCestQuerySchema = createPaginationQuerySchema(100);

const cestCodeSchema = z
  .string()
  .trim()
  .length(7, "CEST deve ter exatamente 7 caracteres")

const ncmCodeSchema = z
  .string()
  .trim()
  .min(4, "Produto NCM deve ter no minimo 4 caracteres");

export const createProductsCestSchema = z
  .object({
    cest: cestCodeSchema,
    description: z.string().trim().min(1).max(255).toUpperCase(),
    productsNcmId: z.string().uuid("Campo 'productsNcmId' deve ser um UUID valido"),
  })
  .strict();

export const patchProductsCestSchema = z
  .object({
    cest: cestCodeSchema.optional(),
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
    productsNcmId: z.string().uuid("Campo 'productsNcmId' deve ser um UUID valido").optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.cest !== undefined ||
      data.description !== undefined ||
      data.productsNcmId !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const productsCestParamsSchema = z
  .object({
    productsCestId: z
      .string()
      .uuid("Campo 'productsCestId' deve ser um UUID valido"),
  })
  .strict();

export type ListProductsCestQuery = z.infer<typeof listProductsCestQuerySchema>;
export type CreateProductsCestInput = z.infer<typeof createProductsCestSchema>;
export type PatchProductsCestInput = z.infer<typeof patchProductsCestSchema>;
export type ProductsCestParams = z.infer<typeof productsCestParamsSchema>;
