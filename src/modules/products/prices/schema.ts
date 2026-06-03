import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listPricesQuerySchema = createPaginationQuerySchema(100);

export const createPriceSchema = z
  .object({
    price: z.number().positive(),
    averageCost: z.number().min(0).optional(),
    priceCost: z.number().min(0).optional(),
    productsEnterprisesId: z.string().uuid(),
  })
  .strict();

export const patchPriceSchema = z
  .object({
    price: z.number().positive().optional(),
    averageCost: z.number().min(0).nullable().optional(),
    priceCost: z.number().min(0).nullable().optional(),
    productsEnterprisesId: z.string().uuid().optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const priceParamsSchema = z
  .object({
    priceId: z.string().uuid("Campo 'priceId' deve ser um UUID valido"),
  })
  .strict();

export type ListPricesQuery = z.infer<typeof listPricesQuerySchema>;
export type CreatePriceInput = z.infer<typeof createPriceSchema>;
export type PatchPriceInput = z.infer<typeof patchPriceSchema>;
