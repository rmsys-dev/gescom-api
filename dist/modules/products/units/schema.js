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
