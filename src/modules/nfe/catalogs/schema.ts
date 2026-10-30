import { z } from "zod";
import { uuidSchema } from "../../../shared/validation/common-schemas.js";
import { catalogListQueryBase } from "../../products/shared/catalog-list-query.js";

export const listNfeCatalogQuerySchema = z
  .object({ ...catalogListQueryBase })
  .strict();

export const listBenefitCodesQuerySchema = z
  .object({
    ...catalogListQueryBase,
    uf: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "UF invalida")
      .optional(),
  })
  .strict();

export const nfeCatalogIdParamsSchema = z
  .object({ catalogId: uuidSchema("catalogId") })
  .strict();

export type ListNfeCatalogQuery = z.infer<typeof listNfeCatalogQuerySchema>;
export type ListBenefitCodesQuery = z.infer<typeof listBenefitCodesQuerySchema>;
