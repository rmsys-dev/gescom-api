import { z } from "zod";
import {
  catalogListFilterText,
  catalogListQueryBase,
} from "../shared/catalog-list-query.js";

export const listPisCofinsSituationQuerySchema = z
  .object({
    ...catalogListQueryBase,
    cst: catalogListFilterText,
  })
  .strict();

export const pisCofinsSituationParamsSchema = z
  .object({
    pisCofinsSituationId: z
      .string()
      .uuid("Campo 'pisCofinsSituationId' deve ser um UUID valido"),
  })
  .strict();

export type ListPisCofinsSituationQuery = z.infer<
  typeof listPisCofinsSituationQuerySchema
>;
