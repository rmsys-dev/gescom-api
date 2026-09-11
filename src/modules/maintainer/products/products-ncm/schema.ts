import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";

const ncmCodeSchema = z
  .string()
  .trim()
  .min(2, "NCM deve ter no minimo 2 caracteres");

export const createProductsNcmSchema = z
  .object({
    ncm: ncmCodeSchema,
    description: z.string().trim().min(1).max(255),
  })
  .strict();

export const patchProductsNcmSchema = z
  .object({
    ncm: ncmCodeSchema.optional(),
    description: z.string().trim().min(1).max(255).optional(),
  })
  .strict()
  .refine(
    (data) => data.ncm !== undefined || data.description !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const productsNcmParamsSchema = z
  .object({
    productsNcmId: uuidSchema("productsNcmId"),
  })
  .strict();

export type CreateMaintainerProductsNcmInput = z.infer<
  typeof createProductsNcmSchema
>;
export type PatchMaintainerProductsNcmInput = z.infer<
  typeof patchProductsNcmSchema
>;
