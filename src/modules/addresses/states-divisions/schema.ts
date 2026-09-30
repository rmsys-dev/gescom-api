import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";
import { twoLetterCodeSchema, uuidIdSchema } from "../shared/address-schemas.js";
import { uuidQuerySchema } from "../shared/list-query-schemas.js";

export const listStatesDivisionsQuerySchema = createPaginationQuerySchema(100)
  .extend({
    statesId: uuidQuerySchema("statesId").optional(),
  })
  .strict();

export const createStateDivisionSchema = z
  .object({
    statesId: uuidIdSchema("statesId"),
    uf: twoLetterCodeSchema("UF da divisao"),
  })
  .strict();

export const patchStateDivisionSchema = z
  .object({
    statesId: uuidIdSchema("statesId").optional(),
    uf: twoLetterCodeSchema("UF da divisao").optional(),
    softDelete: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.statesId !== undefined ||
      data.uf !== undefined ||
      data.softDelete === true,
    "Deve haver ao menos um campo para atualizar",
  );

export const stateDivisionParamsSchema = z
  .object({
    stateDivisionId: uuidIdSchema("stateDivisionId"),
  })
  .strict();

export type ListStatesDivisionsQuery = z.infer<
  typeof listStatesDivisionsQuerySchema
>;
export type CreateStateDivisionInput = z.infer<typeof createStateDivisionSchema>;
export type PatchStateDivisionInput = z.infer<typeof patchStateDivisionSchema>;
