import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listStockSectorsQuerySchema = createPaginationQuerySchema(100);

export const createStockSectorSchema = z
  .object({
    description: z.string().trim().min(1).max(255).toUpperCase(),
  })
  .strict();

export const patchStockSectorSchema = z
  .object({
    description: z.string().trim().min(1).max(255).toUpperCase().optional(),
  })
  .strict()
  .refine(
    (data) => data.description !== undefined,
    "Deve haver ao menos um campo para atualizar",
  );

export const stockSectorParamsSchema = z
  .object({
    stockSectorId: z
      .string()
      .uuid("Campo 'stockSectorId' deve ser um UUID valido"),
  })
  .strict();

export type ListStockSectorsQuery = z.infer<typeof listStockSectorsQuerySchema>;
export type CreateStockSectorInput = z.infer<typeof createStockSectorSchema>;
export type PatchStockSectorInput = z.infer<typeof patchStockSectorSchema>;
