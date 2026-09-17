import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";

const typeCodeSchema = z
  .string()
  .trim()
  .length(2, "Tipo de produto deve ter no maximo 2 caracteres");

export const createTypeProductSchema = z
  .object({
    type: typeCodeSchema,
    description: z.string().trim().min(1).max(255),
    manufacturing: z.boolean().default(false).optional(),
    sales: z.boolean().default(false).optional(),
    typeSpedId: uuidSchema("typeSpedId"),
  })
  .strict();

export const patchTypeProductSchema = z
  .object({
    type: typeCodeSchema.optional(),
    description: z.string().trim().min(1).max(255).optional(),
    manufacturing: z.boolean().optional(),
    sales: z.boolean().optional(),
    typeSpedId: uuidSchema("typeSpedId").optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.type !== undefined ||
      data.description !== undefined ||
      data.manufacturing !== undefined ||
      data.sales !== undefined ||
      data.typeSpedId !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const typeProductParamsSchema = z
  .object({
    typeProductId: uuidSchema("typeProductId"),
  })
  .strict();

export type CreateMaintainerTypeProductInput = z.infer<
  typeof createTypeProductSchema
>;
export type PatchMaintainerTypeProductInput = z.infer<
  typeof patchTypeProductSchema
>;
