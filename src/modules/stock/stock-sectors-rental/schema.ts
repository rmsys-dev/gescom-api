import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

export const listStockSectorsRentalQuerySchema =
  createPaginationQuerySchema(100);

export const createStockSectorRentalSchema = z
  .object({
    productsEnterprisesId: z.string().uuid(),
    stockLocationId: z.string().uuid(),
    quantity: z.number().min(0),
  })
  .strict();

export const patchStockSectorRentalSchema = z
  .object({
    productsEnterprisesId: z.string().uuid().optional(),
    stockLocationId: z.string().uuid().optional(),
    quantity: z.number().min(0).optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const stockSectorRentalParamsSchema = z
  .object({
    stockSectorRentalId: z
      .string()
      .uuid("Campo 'stockSectorRentalId' deve ser um UUID valido"),
  })
  .strict();

export type ListStockSectorsRentalQuery = z.infer<
  typeof listStockSectorsRentalQuerySchema
>;
export type CreateStockSectorRentalInput = z.infer<
  typeof createStockSectorRentalSchema
>;
export type PatchStockSectorRentalInput = z.infer<
  typeof patchStockSectorRentalSchema
>;
