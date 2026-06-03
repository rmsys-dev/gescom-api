import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listStockBatchesQuerySchema = createPaginationQuerySchema(100);

const batchStatusSchema = z.enum(["ATIVO", "BLOQUEADO", "ESGOTADO"]);

export const createStockBatchSchema = z
  .object({
    batchNumber: z.string().trim().min(1).max(64).toUpperCase(),
    productsEnterprisesId: z.string().uuid(),
    manufacturingDate: z.coerce.date().optional(),
    expiryDate: z.coerce.date().optional(),
    documentRef: z.string().trim().max(100).optional(),
    status: batchStatusSchema.optional(),
    notes: z.string().trim().max(500).optional(),
  })
  .strict();

export const patchStockBatchSchema = z
  .object({
    batchNumber: z.string().trim().min(1).max(64).toUpperCase().optional(),
    manufacturingDate: z.coerce.date().nullable().optional(),
    expiryDate: z.coerce.date().nullable().optional(),
    documentRef: z.string().trim().max(100).nullable().optional(),
    status: batchStatusSchema.optional(),
    notes: z.string().trim().max(500).nullable().optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const stockBatchParamsSchema = z
  .object({
    stockBatchId: z.string().uuid("Campo 'stockBatchId' deve ser um UUID valido"),
  })
  .strict();

export type ListStockBatchesQuery = z.infer<typeof listStockBatchesQuerySchema>;
export type CreateStockBatchInput = z.infer<typeof createStockBatchSchema>;
export type PatchStockBatchInput = z.infer<typeof patchStockBatchSchema>;
