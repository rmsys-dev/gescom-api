import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listStockLocationsQuerySchema = createPaginationQuerySchema(100);

const statusSchema = z.enum([
  "ATIVO",
  "INATIVO",
  "BLOQUEADO",
  "PENDENTE",
  "ESPECIAL",
  "COBRANCA",
  "NAO_VENDER",
]);

export const createStockLocationSchema = z
  .object({
    code: z.string().trim().min(1).max(64).toUpperCase(),
    description: z.string().trim().max(255).optional(),
    stockSectorId: z.string().uuid(),
    status: statusSchema.optional(),
  })
  .strict();

export const patchStockLocationSchema = z
  .object({
    code: z.string().trim().min(1).max(64).toUpperCase().optional(),
    description: z.string().trim().max(255).nullable().optional(),
    stockSectorId: z.string().uuid().optional(),
    status: statusSchema.optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const stockLocationParamsSchema = z
  .object({
    stockLocationId: z
      .string()
      .uuid("Campo 'stockLocationId' deve ser um UUID valido"),
  })
  .strict();

export type ListStockLocationsQuery = z.infer<
  typeof listStockLocationsQuerySchema
>;
export type CreateStockLocationInput = z.infer<typeof createStockLocationSchema>;
export type PatchStockLocationInput = z.infer<typeof patchStockLocationSchema>;
