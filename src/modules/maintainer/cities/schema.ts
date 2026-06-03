import { z } from "zod";
import {
  taxRateSchema,
  twoLetterCodeSchema,
  uuidIdSchema,
} from "../shared/address-schemas.js";

export const createCitySchema = z
  .object({
    ibgeCode: z.number().int().positive(),
    citieName: z.string().trim().min(1).max(255),
    citieCode: twoLetterCodeSchema("Codigo da cidade"),
    citieDigit: z.number().int(),
    ibs_municipal_tax: taxRateSchema,
    stateId: uuidIdSchema("stateId"),
  })
  .strict();

export const patchCitySchema = z
  .object({
    ibgeCode: z.number().int().positive().optional(),
    citieName: z.string().trim().min(1).max(255).optional(),
    citieCode: twoLetterCodeSchema("Codigo da cidade").optional(),
    citieDigit: z.number().int().optional(),
    ibs_municipal_tax: taxRateSchema.optional(),
    stateId: uuidIdSchema("stateId").optional(),
    softDelete: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.ibgeCode !== undefined ||
      data.citieName !== undefined ||
      data.citieCode !== undefined ||
      data.citieDigit !== undefined ||
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

export type CreateMaintainerCityInput = z.infer<typeof createCitySchema>;
export type PatchMaintainerCityInput = z.infer<typeof patchCitySchema>;
