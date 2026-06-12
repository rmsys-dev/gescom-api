import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listProductSubgroupsQuerySchema = createPaginationQuerySchema(100);

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
    description: z.string().trim().min(1).max(255).toUpperCase(),
    ...productSubgroupCommissionFieldsSchema,
  })
  .strict();

export const patchProductSubgroupSchema = z
  .object({
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
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
