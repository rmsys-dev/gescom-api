import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listProductSubgroupsQuerySchema = createPaginationQuerySchema(100);

export const createProductSubgroupSchema = z
  .object({
    description: z.string().trim().min(1).max(255).toUpperCase(),
  })
  .strict();

export const patchProductSubgroupSchema = z
  .object({
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
  })
  .strict()
  .refine(
    (data) => data.description !== undefined,
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
