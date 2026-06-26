import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";
import {
  cepNumberSchema,
  uuidIdSchema,
} from "../shared/address-schemas.js";
import {
  cepNumberQuerySchema,
  uuidQuerySchema,
} from "../shared/list-query-schemas.js";

export const listCepsQuerySchema = createPaginationQuerySchema(100)
  .extend({
    cityId: uuidQuerySchema("cityId").optional(),
    cepNumber: cepNumberQuerySchema.optional(),
  })
  .strict()
  .refine(
    (data) => data.cityId !== undefined || data.cepNumber !== undefined,
    "Informe cityId ou cepNumber para listar CEPs",
  );

export const createCepSchema = z
  .object({
    cepNumber: cepNumberSchema,
    address: z.string().trim().min(1).max(255),
    neighborhood: z.string().trim().min(1).max(255),
    cityId: uuidIdSchema("cityId"),
  })
  .strict();

export const patchCepSchema = z
  .object({
    cepNumber: cepNumberSchema.optional(),
    address: z.string().trim().min(1).max(255).optional(),
    neighborhood: z.string().trim().min(1).max(255).optional(),
    cityId: uuidIdSchema("cityId").optional(),
    softDelete: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.cepNumber !== undefined ||
      data.address !== undefined ||
      data.neighborhood !== undefined ||
      data.cityId !== undefined ||
      data.softDelete === true,
    "Deve haver ao menos um campo para atualizar",
  );

export const cepParamsSchema = z
  .object({
    cepId: uuidIdSchema("cepId"),
  })
  .strict();

export type ListCepsQuery = z.infer<typeof listCepsQuerySchema>;
export type CreateCepInput = z.infer<typeof createCepSchema>;
export type PatchCepInput = z.infer<typeof patchCepSchema>;
