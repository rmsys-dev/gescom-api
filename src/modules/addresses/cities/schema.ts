import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";
import { uuidQuerySchema } from "../shared/list-query-schemas.js";

export const listCitiesQuerySchema = createPaginationQuerySchema(200)
  .extend({
    stateId: uuidQuerySchema("stateId").optional(),
  })
  .strict();

export type ListCitiesQuery = z.infer<typeof listCitiesQuerySchema>;
