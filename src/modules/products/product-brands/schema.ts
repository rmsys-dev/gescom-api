import { z } from "zod";
import {
  createPaginationQuerySchema,
  uuidSchema,
} from "../../../shared/validation/common-schemas.js";
import { normalizeEnterpriseCatalogDescription } from "../shared/enterprise-catalog-description.js";

export const listProductBrandsQuerySchema = createPaginationQuerySchema(100).extend({
  description: z.string().trim().min(1).max(255).optional(),
});

const enterpriseCatalogDescriptionSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .transform(normalizeEnterpriseCatalogDescription);

export const createProductBrandSchema = z
  .object({
    description: enterpriseCatalogDescriptionSchema,
  })
  .strict();

export const patchProductBrandSchema = z
  .object({
    description: enterpriseCatalogDescriptionSchema.optional(),
  })
  .strict()
  .refine(
    (data) => data.description !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const productBrandEnterpriseParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
  })
  .strict();

export const productBrandParamsSchema = z
  .object({
    productBrandId: z
      .string()
      .uuid("Campo 'productBrandId' deve ser um UUID valido"),
  })
  .strict();

export type ListProductBrandsQuery = z.infer<typeof listProductBrandsQuerySchema>;
export type CreateProductBrandInput = z.infer<typeof createProductBrandSchema>;
export type PatchProductBrandInput = z.infer<typeof patchProductBrandSchema>;
