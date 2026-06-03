import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listPromotionalPricesQuerySchema =
  createPaginationQuerySchema(100);

export const createPromotionalPriceSchema = z
  .object({
    description: z.string().trim().max(255).toUpperCase().optional(),
    price: z.number().positive(),
    startDate: z.coerce.date(),
    endDate: z.coerce.date(),
    productsEnterprisesId: z.string().uuid(),
  })
  .strict()
  .refine((data) => data.endDate >= data.startDate, {
    message: "endDate deve ser maior ou igual a startDate",
    path: ["endDate"],
  });

export const patchPromotionalPriceSchema = z
  .object({
    description: z.string().trim().max(255).toUpperCase().nullable().optional(),
    price: z.number().positive().optional(),
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
    productsEnterprisesId: z.string().uuid().optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const promotionalPriceParamsSchema = z
  .object({
    promotionalPriceId: z
      .string()
      .uuid("Campo 'promotionalPriceId' deve ser um UUID valido"),
  })
  .strict();

export type ListPromotionalPricesQuery = z.infer<
  typeof listPromotionalPricesQuerySchema
>;
export type CreatePromotionalPriceInput = z.infer<
  typeof createPromotionalPriceSchema
>;
export type PatchPromotionalPriceInput = z.infer<
  typeof patchPromotionalPriceSchema
>;
