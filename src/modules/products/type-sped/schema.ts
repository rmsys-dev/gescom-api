import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listTypeSpedQuerySchema = createPaginationQuerySchema(100);

const typeSpedCodeSchema = z
  .string()
  .trim()
  .length(2, "Tipo SPED deve ter exatamente 2 caracteres");

export const createTypeSpedSchema = z
  .object({
    type: typeSpedCodeSchema,
    description: z.string().trim().min(1).max(255).toUpperCase(),
    generateInventory: z.boolean().default(true).optional(),
  })
  .strict();

export const patchTypeSpedSchema = z
  .object({
    type: typeSpedCodeSchema.optional(),
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
    generateInventory: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.type !== undefined ||
      data.description !== undefined ||
      data.generateInventory !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const typeSpedParamsSchema = z
  .object({
    typeSpedId: z.string().uuid("Campo 'typeSpedId' deve ser um UUID valido"),
  })
  .strict();

export type ListTypeSpedQuery = z.infer<typeof listTypeSpedQuerySchema>;
export type CreateTypeSpedInput = z.infer<typeof createTypeSpedSchema>;
export type PatchTypeSpedInput = z.infer<typeof patchTypeSpedSchema>;
export type TypeSpedParams = z.infer<typeof typeSpedParamsSchema>;
