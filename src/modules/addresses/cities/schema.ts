import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";
import {
  taxRateSchema,
  uuidIdSchema,
} from "../shared/address-schemas.js";
import { uuidQuerySchema } from "../shared/list-query-schemas.js";

export const listCitiesQuerySchema = createPaginationQuerySchema(200)
  .extend({
    stateId: uuidQuerySchema("stateId").optional(),
  })
  .strict();

export const createCitySchema = z
  .object({
    ibgeCode: z.number().int().positive(),
    citieName: z.string().trim().min(1).max(255),
    ibs_municipal_tax: taxRateSchema,
    stateId: uuidIdSchema("stateId"),
  })
  .strict();

export const patchCitySchema = z
  .object({
    ibgeCode: z.number().int().positive().optional(),
    citieName: z.string().trim().min(1).max(255).optional(),
    ibs_municipal_tax: taxRateSchema.optional(),
    stateId: uuidIdSchema("stateId").optional(),
    softDelete: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.ibgeCode !== undefined ||
      data.citieName !== undefined ||
      data.ibs_municipal_tax !== undefined ||
      data.stateId !== undefined ||
      data.softDelete === true,
    "Deve haver ao menos um campo para atualizar",
  );

export const cityParamsSchema = z
  .object({
    cityId: uuidIdSchema("cityId"),
  })
  .strict();

export type ListCitiesQuery = z.infer<typeof listCitiesQuerySchema>;
export type CreateCityInput = z.infer<typeof createCitySchema>;
export type PatchCityInput = z.infer<typeof patchCitySchema>;
