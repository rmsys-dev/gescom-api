import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listProductTaxationQuerySchema = createPaginationQuerySchema(100);

const cstCodeSchema = z
  .string()
  .trim()
  .length(2, "CST deve ter exatamente 2 caracteres");

export const createProductTaxationSchema = z
  .object({
    cst_pis_entrada: cstCodeSchema,
    cst_pis_saida: cstCodeSchema,
    cst_cofins_entrada: cstCodeSchema,
    cst_cofins_saida: cstCodeSchema,
    productsEnterprisesId: z.string().uuid(),
    icmsTaxationId: z.string().uuid(),
  })
  .strict();

export const patchProductTaxationSchema = z
  .object({
    cst_pis_entrada: cstCodeSchema.optional(),
    cst_pis_saida: cstCodeSchema.optional(),
    cst_cofins_entrada: cstCodeSchema.optional(),
    cst_cofins_saida: cstCodeSchema.optional(),
    productsEnterprisesId: z.string().uuid().optional(),
    icmsTaxationId: z.string().uuid().optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const productTaxationParamsSchema = z
  .object({
    productTaxationId: z
      .string()
      .uuid("Campo 'productTaxationId' deve ser um UUID valido"),
  })
  .strict();

export type ListProductTaxationQuery = z.infer<
  typeof listProductTaxationQuerySchema
>;
export type CreateProductTaxationInput = z.infer<
  typeof createProductTaxationSchema
>;
export type PatchProductTaxationInput = z.infer<
  typeof patchProductTaxationSchema
>;
