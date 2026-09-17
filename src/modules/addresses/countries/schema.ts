import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";
import {
  countryCodeSchema,
  taxRateSchema,
  uuidIdSchema,
} from "../shared/address-schemas.js";

export const listCountriesQuerySchema = createPaginationQuerySchema(100);

export const createCountrySchema = z
  .object({
    countryCode: countryCodeSchema,
    countryName: z.string().trim().min(1).max(255),
    cbsTax: taxRateSchema,
    isTax: taxRateSchema,
    ibs_uf_tax: taxRateSchema,
    ibs_municipal_tax: taxRateSchema,
  })
  .strict();

export const patchCountrySchema = z
  .object({
    countryCode: countryCodeSchema.optional(),
    countryName: z.string().trim().min(1).max(255).optional(),
    cbsTax: taxRateSchema.optional(),
    isTax: taxRateSchema.optional(),
    ibs_uf_tax: taxRateSchema.optional(),
    ibs_municipal_tax: taxRateSchema.optional(),
    softDelete: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.countryCode !== undefined ||
      data.countryName !== undefined ||
      data.cbsTax !== undefined ||
      data.isTax !== undefined ||
      data.ibs_uf_tax !== undefined ||
      data.ibs_municipal_tax !== undefined ||
      data.softDelete === true,
    "Deve haver ao menos um campo para atualizar",
  );

export const countryParamsSchema = z
  .object({
    countryId: uuidIdSchema("countryId"),
  })
  .strict();

export type ListCountriesQuery = z.infer<typeof listCountriesQuerySchema>;
export type CreateCountryInput = z.infer<typeof createCountrySchema>;
export type PatchCountryInput = z.infer<typeof patchCountrySchema>;
