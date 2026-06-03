import { z } from "zod";
import {
  taxRateSchema,
  twoLetterCodeSchema,
  uuidIdSchema,
} from "../shared/address-schemas.js";

export const createCountrySchema = z
  .object({
    countryCode: twoLetterCodeSchema("Codigo do pais"),
    countryName: z.string().trim().min(1).max(255),
    cbsTax: taxRateSchema,
    isTax: taxRateSchema,
    ibs_uf_tax: taxRateSchema,
    ibs_municipal_tax: taxRateSchema,
  })
  .strict();

export const patchCountrySchema = z
  .object({
    countryCode: twoLetterCodeSchema("Codigo do pais").optional(),
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

export type CreateMaintainerCountryInput = z.infer<typeof createCountrySchema>;
export type PatchMaintainerCountryInput = z.infer<typeof patchCountrySchema>;
