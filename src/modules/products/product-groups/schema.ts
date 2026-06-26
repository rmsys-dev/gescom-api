import { z } from "zod";
import {
  createPaginationQuerySchema,
  uuidSchema,
} from "../../../shared/validation/common-schemas.js";
import { normalizeEnterpriseCatalogDescription } from "../shared/enterprise-catalog-description.js";

export const listProductGroupsQuerySchema = createPaginationQuerySchema(100).extend({
  description: z.string().trim().min(1).max(255).optional(),
});

const enterpriseCatalogDescriptionSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .transform(normalizeEnterpriseCatalogDescription);

export const createProductGroupSchema = z
  .object({
    description: enterpriseCatalogDescriptionSchema,
    profitMargin: z.number().min(0).optional(),
  })
  .strict();

export const patchProductGroupSchema = z
  .object({
    description: enterpriseCatalogDescriptionSchema.optional(),
    profitMargin: z.number().min(0).nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.description !== undefined || data.profitMargin !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const productGroupEnterpriseParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
  })
  .strict();

export const productGroupParamsSchema = z
  .object({
    productGroupId: z
      .string()
      .uuid("Campo 'productGroupId' deve ser um UUID valido"),
  })
  .strict();

export type ListProductGroupsQuery = z.infer<typeof listProductGroupsQuerySchema>;
export type CreateProductGroupInput = z.infer<typeof createProductGroupSchema>;
export type PatchProductGroupInput = z.infer<typeof patchProductGroupSchema>;
