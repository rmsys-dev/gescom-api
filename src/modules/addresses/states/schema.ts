import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";
import {
  taxRateSchema,
  twoLetterCodeSchema,
  uuidIdSchema,
} from "../shared/address-schemas.js";
import { uuidQuerySchema } from "../shared/list-query-schemas.js";

export const listStatesQuerySchema = createPaginationQuerySchema(100)
  .extend({
    countryId: uuidQuerySchema("countryId").optional(),
  })
  .strict();

export const createStateSchema = z
  .object({
    acronym: twoLetterCodeSchema("Sigla do estado"),
    description: z.string().trim().min(1).max(255),
    internalAliquot: taxRateSchema,
    interstateAliquot: taxRateSchema,
    fcpAliquot: taxRateSchema,
    borders: z.number().int().min(0),
    embedDifal: z.boolean(),
    ibs_uf_tax: taxRateSchema,
    ibs_municipal_tax: taxRateSchema,
    countryId: uuidIdSchema("countryId"),
  })
  .strict();

export const patchStateSchema = z
  .object({
    acronym: twoLetterCodeSchema("Sigla do estado").optional(),
    description: z.string().trim().min(1).max(255).optional(),
    internalAliquot: taxRateSchema.optional(),
    interstateAliquot: taxRateSchema.optional(),
    fcpAliquot: taxRateSchema.optional(),
    borders: z.number().int().min(0).optional(),
    embedDifal: z.boolean().optional(),
    ibs_uf_tax: taxRateSchema.optional(),
    ibs_municipal_tax: taxRateSchema.optional(),
    countryId: uuidIdSchema("countryId").optional(),
    softDelete: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.acronym !== undefined ||
      data.description !== undefined ||
      data.internalAliquot !== undefined ||
      data.interstateAliquot !== undefined ||
      data.fcpAliquot !== undefined ||
      data.borders !== undefined ||
      data.embedDifal !== undefined ||
      data.ibs_uf_tax !== undefined ||
      data.ibs_municipal_tax !== undefined ||
      data.countryId !== undefined ||
      data.softDelete === true,
    "Deve haver ao menos um campo para atualizar",
  );

export const stateParamsSchema = z
  .object({
    stateId: uuidIdSchema("stateId"),
  })
  .strict();

export type ListStatesQuery = z.infer<typeof listStatesQuerySchema>;
export type CreateStateInput = z.infer<typeof createStateSchema>;
export type PatchStateInput = z.infer<typeof patchStateSchema>;
