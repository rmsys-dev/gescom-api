import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listUnitsQuerySchema = createPaginationQuerySchema(100);

const unitCodeSchema = z
  .string()
  .trim()
  .length(2, "Unidade de medida deve conter exatamente 2 letras")
  .regex(/^[A-Za-z]{2}$/, "Unidade de medida deve conter exatamente 2 letras")
  .transform((val) => val.toUpperCase());

export const createUnitSchema = z
  .object({
    unit: unitCodeSchema,
    description: z.string().trim().min(1).max(255).toUpperCase(),
    compatible: unitCodeSchema.optional(),
  })
  .strict();

export const patchUnitSchema = z
  .object({
    unit: unitCodeSchema.optional(),
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
    compatible: unitCodeSchema.optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.unit !== undefined ||
      data.description !== undefined ||
      data.compatible !== undefined ||
    "Deve haver ao menos um campo para atualizar",
  );

export const unitParamsSchema = z
  .object({
    unitId: z.string().uuid("Campo 'unitId' deve ser um UUID valido"),
  })
  .strict();

export type ListUnitsQuery = z.infer<typeof listUnitsQuerySchema>;
export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type PatchUnitInput = z.infer<typeof patchUnitSchema>;
export type UnitParams = z.infer<typeof unitParamsSchema>;
