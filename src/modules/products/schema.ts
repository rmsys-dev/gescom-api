import { z } from "zod";
import { statusEnum } from "../../db/schema.js";
import { createPaginationQuerySchema } from "../../shared/validation/common-schemas.js";
import { isValidGtin } from "../../shared/validation/data-normalizers.js";
import { createProductEnterprisePayloadSchema } from "./products-enterprises/schema.js";

const statusSchema = z.enum(statusEnum.enumValues);

const gtinMessage =
  "Codigo de barras invalido: use GTIN/EAN com 8, 12, 13 ou 14 digitos e digito verificador correto";
const barCodeSchema = z
  .string()
  .trim()
  .refine((value) => isValidGtin(value), gtinMessage);

export const listProductsQuerySchema = createPaginationQuerySchema(100).extend({
  status: statusSchema.optional(),
  search: z.string().trim().min(1).optional(),
});

export const createProductSchema = z
  .object({
    status: statusSchema.default("ATIVO").optional(),
    description: z.string().trim().min(1).max(255),
    barCode: barCodeSchema.optional(),
  })
  .strict();

export const createProductWithEnterpriseSchema = z
  .object({
    product: createProductSchema,
    enterprise: createProductEnterprisePayloadSchema,
  })
  .strict();

export const patchProductSchema = z
  .object({
    status: statusSchema.optional(),
    description: z.string().trim().min(1).max(255).optional(),
    barCode: z
      .string()
      .trim()
      .refine((value) => value === "" || isValidGtin(value), gtinMessage)
      .nullable()
      .optional(),
  })
  .strict()
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: "Deve haver ao menos um campo para atualizar",
  });

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
export type PatchProductInput = z.infer<typeof patchProductSchema>;
