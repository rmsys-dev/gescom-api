import { z } from "zod";
import {
  catalogListFilterText,
  catalogListQueryBase,
} from "../shared/catalog-list-query.js";

export const listProductsCestQuerySchema = z
  .object({
    ...catalogListQueryBase,
    cest: catalogListFilterText,
  })
  .strict();

export const productsCestParamsSchema = z
  .object({
    productsCestId: z
      .string()
      .uuid("Campo 'productsCestId' deve ser um UUID valido"),
  })
  .strict();

export type ListProductsCestQuery = z.infer<typeof listProductsCestQuerySchema>;
export type ProductsCestParams = z.infer<typeof productsCestParamsSchema>;
