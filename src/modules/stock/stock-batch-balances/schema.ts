import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listStockBatchBalancesQuerySchema =
  createPaginationQuerySchema(100);

export const createStockBatchBalanceSchema = z
  .object({
    stockBatchId: z.string().uuid(),
    stockLocationId: z.string().uuid(),
    quantity: z.number().min(0),
  })
  .strict();

export const patchStockBatchBalanceSchema = z
  .object({
    stockBatchId: z.string().uuid().optional(),
    stockLocationId: z.string().uuid().optional(),
    quantity: z.number().min(0).optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const stockBatchBalanceParamsSchema = z
  .object({
    stockBatchBalanceId: z
      .string()
      .uuid("Campo 'stockBatchBalanceId' deve ser um UUID valido"),
  })
  .strict();

export type ListStockBatchBalancesQuery = z.infer<
  typeof listStockBatchBalancesQuerySchema
>;
export type CreateStockBatchBalanceInput = z.infer<
  typeof createStockBatchBalanceSchema
>;
export type PatchStockBatchBalanceInput = z.infer<
  typeof patchStockBatchBalanceSchema
>;
