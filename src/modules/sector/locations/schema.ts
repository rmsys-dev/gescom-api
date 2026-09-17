import { z } from "zod";
import { statusEnum } from "../../../db/schema.js";
import {
  createPaginationQuerySchema,
  optionalTrimmedStringSchema,
} from "../../../shared/validation/common-schemas.js";

export const listLocationsQuerySchema = createPaginationQuerySchema(100)
  .extend({
    box: optionalTrimmedStringSchema("box", 64).optional(),
    description: optionalTrimmedStringSchema("description", 255).optional(),
    sectorId: z.string().uuid().optional(),
    status: z.enum(statusEnum.enumValues).optional(),
  })
  .strict();

const statusSchema = z.enum(statusEnum.enumValues);

export const createLocationSchema = z
  .object({
    box: z.string().trim().min(1).max(64).optional(),
    description: z.string().trim().max(255).optional(),
    sectorId: z.string().uuid(),
    status: statusSchema.optional(),
  })
  .strict();

export const patchLocationSchema = z
  .object({
    box: z.string().trim().min(1).max(64).optional(),
    description: z.string().trim().max(255).nullable().optional(),
    sectorId: z.string().uuid().optional(),
    status: statusSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const locationParamsSchema = z
  .object({
    locationId: z.string().uuid("Campo 'locationId' deve ser um UUID valido"),
  })
  .strict();

export type ListLocationsQuery = z.infer<typeof listLocationsQuerySchema>;
export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type PatchLocationInput = z.infer<typeof patchLocationSchema>;
