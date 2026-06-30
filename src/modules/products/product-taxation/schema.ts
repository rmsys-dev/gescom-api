import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listProductTaxationQuerySchema = createPaginationQuerySchema(100);

const pisCofinsSituationIdSchema = z.string().uuid();

export const createProductTaxationSchema = z
  .object({
    cstPisEntradaId: pisCofinsSituationIdSchema,
    cstPisSaidaId: pisCofinsSituationIdSchema,
    cstCofinsEntradaId: pisCofinsSituationIdSchema,
    cstCofinsSaidaId: pisCofinsSituationIdSchema,
    productsEnterprisesId: z.string().uuid(),
    icmsTaxationId: z.string().uuid(),
  })
  .strict();

export const patchProductTaxationSchema = z
  .object({
    cstPisEntradaId: pisCofinsSituationIdSchema.optional(),
    cstPisSaidaId: pisCofinsSituationIdSchema.optional(),
    cstCofinsEntradaId: pisCofinsSituationIdSchema.optional(),
    cstCofinsSaidaId: pisCofinsSituationIdSchema.optional(),
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
