import { z } from "zod";
import {
  createPaginationQuerySchema,
  uuidSchema,
} from "../../../shared/validation/common-schemas.js";
import { normalizeEnterpriseCatalogDescription } from "../shared/enterprise-catalog-description.js";

export const listProductSubgroupsQuerySchema = createPaginationQuerySchema(100);

const enterpriseCatalogDescriptionSchema = z
  .string()
  .trim()
  .min(1)
  .max(255)
  .transform(normalizeEnterpriseCatalogDescription);

const subgroupPercentageSchema = z.number().min(0).max(100);

const productSubgroupCommissionFieldsSchema = {
  generatesComission: z.boolean().optional(),
  comissionOnSightSeller: subgroupPercentageSchema.optional(),
  comissionToTermsSeller: subgroupPercentageSchema.optional(),
  comissionPartialSeller: subgroupPercentageSchema.optional(),
  comissionOnSightManager: subgroupPercentageSchema.optional(),
  comissionToTermsManager: subgroupPercentageSchema.optional(),
  comissionPartialManager: subgroupPercentageSchema.optional(),
};

export const createProductSubgroupSchema = z
  .object({
    description: enterpriseCatalogDescriptionSchema,
    ...productSubgroupCommissionFieldsSchema,
  })
  .strict();

export const patchProductSubgroupSchema = z
  .object({
    description: enterpriseCatalogDescriptionSchema.optional(),
    ...productSubgroupCommissionFieldsSchema,
  })
  .strict()
  .refine(
    (data) =>
      data.description !== undefined ||
      data.generatesComission !== undefined ||
      data.comissionOnSightSeller !== undefined ||
      data.comissionToTermsSeller !== undefined ||
      data.comissionPartialSeller !== undefined ||
      data.comissionOnSightManager !== undefined ||
      data.comissionToTermsManager !== undefined ||
      data.comissionPartialManager !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const productSubgroupEnterpriseParamsSchema = z
  .object({
    enterpriseId: uuidSchema("enterpriseId"),
  })
  .strict();

export const productSubgroupParamsSchema = z
  .object({
    productSubgroupId: z
      .string()
      .uuid("Campo 'productSubgroupId' deve ser um UUID valido"),
  })
  .strict();

export type ListProductSubgroupsQuery = z.infer<
  typeof listProductSubgroupsQuerySchema
>;
export type CreateProductSubgroupInput = z.infer<
  typeof createProductSubgroupSchema
>;
export type PatchProductSubgroupInput = z.infer<
  typeof patchProductSubgroupSchema
>;
