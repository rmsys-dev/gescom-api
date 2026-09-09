import { z } from "zod";
import { uuidSchema } from "../../../../shared/validation/common-schemas.js";

const pisCofinsTypeSchema = z
  .enum(["ENTRADA", "SAIDA"])
  .transform((val) => val)
  .refine(
    (val) => val === "ENTRADA" || val === "SAIDA",
    "Tipo deve ser 'ENTRADA' ou 'SAIDA'",
  );

export const createPisCofinsSituationSchema = z
  .object({
    cst: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1).max(255),
    type: pisCofinsTypeSchema,
    framing: z.number().int(),
    pisRate: z.number().min(0).optional(),
    cofinsRate: z.number().min(0).optional(),
  })
  .strict();

export const patchPisCofinsSituationSchema = z
  .object({
    cst: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).max(255).optional(),
    type: pisCofinsTypeSchema.optional(),
    framing: z.number().int().optional(),
    pisRate: z.number().min(0).nullable().optional(),
    cofinsRate: z.number().min(0).nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.cst !== undefined ||
      data.description !== undefined ||
      data.type !== undefined ||
      data.framing !== undefined ||
      data.pisRate !== undefined ||
      data.cofinsRate !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const pisCofinsSituationParamsSchema = z
  .object({
    pisCofinsSituationId: uuidSchema("pisCofinsSituationId"),
  })
  .strict();

export type CreateMaintainerPisCofinsSituationInput = z.infer<
  typeof createPisCofinsSituationSchema
>;
export type PatchMaintainerPisCofinsSituationInput = z.infer<
  typeof patchPisCofinsSituationSchema
>;
