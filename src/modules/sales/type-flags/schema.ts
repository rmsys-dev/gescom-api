import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";
import { statusEnum } from "../../../db/schema.js";

export const listTypeFlagsQuerySchema = createPaginationQuerySchema(100);

const statusSchema = z.enum(statusEnum.enumValues);

export const createTypeFlagSchema = z
  .object({
    flagCode: z.string().trim().max(2).regex(/^[0-9]+$/, "O código da bandeira deve ser um número"),
    description: z.string().trim().min(1).max(255),
    status: statusSchema.default("ATIVO").optional(),
  })
  .strict();

export const patchTypeFlagSchema = z
  .object({
    flagCode: z.string().trim().max(2).regex(/^[0-9]+$/, "O código da bandeira deve ser um número").optional(),
    description: z.string().trim().min(1).max(255).optional(),
    status: statusSchema.optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.flagCode !== undefined ||
      data.description !== undefined ||
      data.status !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const typeFlagParamsSchema = z
  .object({
    typeFlagId: z.string().uuid("Campo 'typeFlagId' deve ser um UUID valido"),
  })
  .strict();

export type ListTypeFlagsQuery = z.infer<typeof listTypeFlagsQuerySchema>;
export type CreateTypeFlagInput = z.infer<typeof createTypeFlagSchema>;
export type PatchTypeFlagInput = z.infer<typeof patchTypeFlagSchema>;
