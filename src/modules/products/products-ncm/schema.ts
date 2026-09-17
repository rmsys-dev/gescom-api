import { z } from "zod";
import {
  catalogListFilterText,
  catalogListQueryBase,
} from "../shared/catalog-list-query.js";

export const listProductsNcmQuerySchema = z
  .object({
    ...catalogListQueryBase,
    ncm: catalogListFilterText,
  })
  .strict();

export const productsNcmParamsSchema = z
  .object({
    productsNcmId: z
      .string()
      .uuid("Campo 'productsNcmId' deve ser um UUID valido"),
  })
  .strict();

export type ListProductsNcmQuery = z.infer<typeof listProductsNcmQuerySchema>;
export type ProductsNcmParams = z.infer<typeof productsNcmParamsSchema>;
