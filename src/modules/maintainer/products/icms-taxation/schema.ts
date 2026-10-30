import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";

const icmsCodeSchema = z.string().trim().min(1).max(255);

export const createIcmsTaxationSchema = z
  .object({
    icms: icmsCodeSchema,
    description: z.string().trim().min(1).max(255),
    icmsRate: z.number().min(0).max(100).default(0).optional(),
    simplesIcmsRate: z.number().min(0).max(100).default(0).optional(),
  })
  .strict();

export const patchIcmsTaxationSchema = z
  .object({
    icms: icmsCodeSchema.optional(),
    description: z.string().trim().min(1).max(255).optional(),
    icmsRate: z.number().min(0).max(100).optional(),
    simplesIcmsRate: z.number().min(0).max(100).optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.icms !== undefined ||
      data.description !== undefined ||
      data.icmsRate !== undefined ||
      data.simplesIcmsRate !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const icmsTaxationParamsSchema = z
  .object({
    icmsTaxationId: uuidSchema("icmsTaxationId"),
  })
  .strict();

export type CreateMaintainerIcmsTaxationInput = z.infer<
  typeof createIcmsTaxationSchema
>;
export type PatchMaintainerIcmsTaxationInput = z.infer<
  typeof patchIcmsTaxationSchema
>;
