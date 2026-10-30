import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";

const anpCodeSchema = z
  .string()
  .trim()
  .length(9, "ANP deve ter exatamente 9 caracteres");

export const createProductsAnpSchema = z
  .object({
    anp: anpCodeSchema,
    description: z.string().trim().min(1).max(255),
  })
  .strict();

export const patchProductsAnpSchema = z
  .object({
    anp: anpCodeSchema.optional(),
    description: z.string().trim().min(1).max(255).optional(),
  })
  .strict()
  .refine(
    (data) => data.anp !== undefined || data.description !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const productsAnpParamsSchema = z
  .object({
    productsAnpId: uuidSchema("productsAnpId"),
  })
  .strict();

export type CreateMaintainerProductsAnpInput = z.infer<
  typeof createProductsAnpSchema
>;
export type PatchMaintainerProductsAnpInput = z.infer<
  typeof patchProductsAnpSchema
>;
