import { z } from "zod";
import {
  catalogListFilterText,
  catalogListQueryBase,
} from "../shared/catalog-list-query.js";

export const listIcmsTaxationQuerySchema = z
  .object({
    ...catalogListQueryBase,
    icms: catalogListFilterText,
  })
  .strict();

export const icmsTaxationParamsSchema = z
  .object({
    icmsTaxationId: z
      .string()
      .uuid("Campo 'icmsTaxationId' deve ser um UUID valido"),
  })
  .strict();

export type ListIcmsTaxationQuery = z.infer<typeof listIcmsTaxationQuerySchema>;
export type IcmsTaxationParams = z.infer<typeof icmsTaxationParamsSchema>;
