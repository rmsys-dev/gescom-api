import { refine, z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listPisCofinsSituationQuerySchema =
  createPaginationQuerySchema(100);

const pisCofinsTypeSchema = z.enum(["ENTRADA", "SAIDA"]).transform((val) => val.toUpperCase())
  .refine(
    (val) => val === "ENTRADA" || val === "SAIDA",
    "Tipo deve ser 'ENTRADA' ou 'SAIDA'",
  );

export type PisCofinsType = z.infer<typeof pisCofinsTypeSchema>;

export const createPisCofinsSituationSchema = z
  .object({
    cst: z.string().trim().min(1).max(255),
    description: z.string().trim().min(1).max(255).toUpperCase(),
    type: pisCofinsTypeSchema,
    framing: z.number().int(),
    pisRate: z.number().min(0).optional(),
    cofinsRate: z.number().min(0).optional(),
  })
  .strict();

export const patchPisCofinsSituationSchema = z
  .object({
    cst: z.string().trim().min(1).max(255).optional(),
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
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
    pisCofinsSituationId: z
      .string()
      .uuid("Campo 'pisCofinsSituationId' deve ser um UUID valido"),
  })
  .strict();

export type ListPisCofinsSituationQuery = z.infer<
  typeof listPisCofinsSituationQuerySchema
>;
export type CreatePisCofinsSituationInput = z.infer<
  typeof createPisCofinsSituationSchema
>;
export type PatchPisCofinsSituationInput = z.infer<
  typeof patchPisCofinsSituationSchema
>;
