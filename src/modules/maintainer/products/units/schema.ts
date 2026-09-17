import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";
import { normalizeUppercaseCode } from "../../../../shared/validation/data-normalizers.js";

const unitCodeSchema = z
  .string()
  .trim()
  .length(2, "Unidade de medida deve conter exatamente 2 letras")
  .regex(/^[A-Za-z]{2}$/, "Unidade de medida deve conter exatamente 2 letras")
  .transform(normalizeUppercaseCode);

export const wholeFractionalSchema = z.enum(["INTEIRO", "FRACIONADO"]);

export const createUnitSchema = z
  .object({
    unit: unitCodeSchema,
    description: z.string().trim().min(1).max(255),
    compatible: unitCodeSchema.optional(),
    wholeFractional: wholeFractionalSchema,
  })
  .strict();

export const patchUnitSchema = z
  .object({
    unit: unitCodeSchema.optional(),
    description: z.string().trim().min(1).max(255).optional(),
    compatible: unitCodeSchema.optional(),
    wholeFractional: wholeFractionalSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const unitParamsSchema = z
  .object({
    unitId: uuidSchema("unitId"),
  })
  .strict();

export type CreateMaintainerUnitInput = z.infer<typeof createUnitSchema>;
export type PatchMaintainerUnitInput = z.infer<typeof patchUnitSchema>;
