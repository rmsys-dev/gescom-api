import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";

const typeSpedCodeSchema = z
  .string()
  .trim()
  .length(2, "Tipo SPED deve ter exatamente 2 caracteres");

export const createTypeSpedSchema = z
  .object({
    type: typeSpedCodeSchema,
    description: z.string().trim().min(1).max(255),
    generateInventory: z.boolean().default(true).optional(),
  })
  .strict();

export const patchTypeSpedSchema = z
  .object({
    type: typeSpedCodeSchema.optional(),
    description: z.string().trim().min(1).max(255).optional(),
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
    typeSpedId: uuidSchema("typeSpedId"),
  })
  .strict();

export type CreateMaintainerTypeSpedInput = z.infer<
  typeof createTypeSpedSchema
>;
export type PatchMaintainerTypeSpedInput = z.infer<typeof patchTypeSpedSchema>;
