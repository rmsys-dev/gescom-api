import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";
import { uuidQuerySchema } from "../shared/list-query-schemas.js";

export const listStatesQuerySchema = createPaginationQuerySchema(100)
  .extend({
    countryId: uuidQuerySchema("countryId").optional(),
  })
  .strict();

export type ListStatesQuery = z.infer<typeof listStatesQuerySchema>;
