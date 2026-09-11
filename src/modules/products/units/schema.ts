import { z } from "zod";
import { catalogListQueryBase } from "../shared/catalog-list-query.js";

export const listUnitsQuerySchema = z
  .object({
    ...catalogListQueryBase,
  })
  .strict();

export const unitParamsSchema = z
  .object({
    unitId: z.string().uuid("Campo 'unitId' deve ser um UUID valido"),
  })
  .strict();

export type ListUnitsQuery = z.infer<typeof listUnitsQuerySchema>;
export type UnitParams = z.infer<typeof unitParamsSchema>;
