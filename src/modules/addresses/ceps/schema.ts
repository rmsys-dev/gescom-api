import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";
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

export type ListCepsQuery = z.infer<typeof listCepsQuerySchema>;
