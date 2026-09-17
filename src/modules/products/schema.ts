import { z } from "zod";
import { statusEnum } from "../../db/schema.js";
import { createPaginationQuerySchema } from "../../shared/validation/common-schemas.js";
import { createProductEnterprisePayloadSchema } from "./products-enterprises/schema.js";

const statusSchema = z.enum(statusEnum.enumValues);

export const listProductsQuerySchema = createPaginationQuerySchema(100).extend({
  status: statusSchema.optional(),
  search: z.string().trim().min(1).optional(),
});

export const createProductSchema = z
  .object({
    status: statusSchema.default("ATIVO").optional(),
    description: z.string().trim().min(1).max(255),
    barCode: z.string().trim().min(1).max(255).optional(),
  })
  .strict();

export const createProductWithEnterpriseSchema = z
  .object({
    product: createProductSchema,
    enterprise: createProductEnterprisePayloadSchema,
  })
  .strict();

export const productParamsSchema = z
  .object({
    productId: z.string().uuid("Campo 'productId' deve ser um UUID valido"),
  })
  .strict();

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type CreateProductWithEnterpriseInput = z.infer<
  typeof createProductWithEnterpriseSchema
>;
export type ListProductsQuery = z.infer<typeof listProductsQuerySchema>;
