import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listProductGroupsQuerySchema = createPaginationQuerySchema(100);

export const createProductGroupSchema = z
  .object({
    description: z.string().trim().min(1).max(255).toUpperCase(),
    profitMargin: z.number().min(0).optional(),
  })
  .strict();

export const patchProductGroupSchema = z
  .object({
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
    profitMargin: z.number().min(0).nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.description !== undefined || data.profitMargin !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

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
