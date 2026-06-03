import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listCountriesQuerySchema = createPaginationQuerySchema(100);

export type ListCountriesQuery = z.infer<typeof listCountriesQuerySchema>;
