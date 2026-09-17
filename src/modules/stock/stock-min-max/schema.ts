import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listStockMinMaxQuerySchema = createPaginationQuerySchema(100);

export const createStockMinMaxSchema = z
  .object({
    quantityMin: z.number().min(0),
    quantityMax: z.number().positive(),
    productsEnterprisesId: z.string().uuid(),
  })
  .strict()
  .refine((data) => data.quantityMax >= data.quantityMin, {
    message: "quantityMax deve ser >= quantityMin",
    path: ["quantityMax"],
  });

export const patchStockMinMaxSchema = z
  .object({
    quantityMin: z.number().min(0).optional(),
    quantityMax: z.number().positive().optional(),
    productsEnterprisesId: z.string().uuid().optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const stockMinMaxParamsSchema = z
  .object({
    stockMinMaxId: z
      .string()
      .uuid("Campo 'stockMinMaxId' deve ser um UUID valido"),
  })
  .strict();

export type ListStockMinMaxQuery = z.infer<typeof listStockMinMaxQuerySchema>;
export type CreateStockMinMaxInput = z.infer<typeof createStockMinMaxSchema>;
export type PatchStockMinMaxInput = z.infer<typeof patchStockMinMaxSchema>;
