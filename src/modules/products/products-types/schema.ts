import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listTypesProductsQuerySchema = createPaginationQuerySchema(100);

const typeCodeSchema = z
  .string()
  .trim()
  .length(2, "Tipo de produto deve ter no maximo 2 caracteres");

export const createTypeProductSchema = z
  .object({
    type: typeCodeSchema,
    description: z.string().trim().min(1).max(255).toUpperCase(),
  })
  .strict();

export const patchTypeProductSchema = z
  .object({
    type: typeCodeSchema.optional(),
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.type !== undefined ||
      data.description !== undefined ||
    "Deve haver ao menos um campo para atualizar",
  );

export const typeProductParamsSchema = z
  .object({
    typeProductId: z
      .string()
      .uuid("Campo 'typeProductId' deve ser um UUID valido"),
  })
  .strict();

export type ListTypesProductsQuery = z.infer<typeof listTypesProductsQuerySchema>;
export type CreateTypeProductInput = z.infer<typeof createTypeProductSchema>;
export type PatchTypeProductInput = z.infer<typeof patchTypeProductSchema>;
export type TypeProductParams = z.infer<typeof typeProductParamsSchema>;
