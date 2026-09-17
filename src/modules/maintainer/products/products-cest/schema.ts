import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";

const cestCodeSchema = z
  .string()
  .trim()
  .length(7, "CEST deve ter exatamente 7 caracteres");

export const createProductsCestSchema = z
  .object({
    cest: cestCodeSchema,
    description: z.string().trim().min(1).max(255),
    productsNcmId: uuidSchema("productsNcmId"),
  })
  .strict();

export const patchProductsCestSchema = z
  .object({
    cest: cestCodeSchema.optional(),
    description: z.string().trim().min(1).max(255).optional(),
    productsNcmId: uuidSchema("productsNcmId").optional(),
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
    productsCestId: uuidSchema("productsCestId"),
  })
  .strict();

export type CreateMaintainerProductsCestInput = z.infer<
  typeof createProductsCestSchema
>;
export type PatchMaintainerProductsCestInput = z.infer<
  typeof patchProductsCestSchema
>;
