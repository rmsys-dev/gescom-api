import { z } from "zod";
import {
  catalogListFilterText,
  catalogListQueryBase,
} from "../shared/catalog-list-query.js";

export const productsNbsParamsSchema = z
  .object({
    productsNbsId: z
      .string()
      .uuid("Campo 'productsNbsId' deve ser um UUID valido"),
  })
  .strict();

export const listProductsNbsQuerySchema = z
  .object({
    ...catalogListQueryBase,
    nbs: catalogListFilterText,
  })
  .strict();

export type ListProductsNbsQuery = z.infer<typeof listProductsNbsQuerySchema>;
