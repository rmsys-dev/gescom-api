import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

const typeServiceSchema = z.enum(["PROPRIO", "OUTROS"]);

export const listMechanicSalesItemsQuerySchema =
  createPaginationQuerySchema(100).extend({
    mechanic: z.string().uuid().optional(),
    salesItemsId: z.string().uuid().optional(),
    saleId: z.string().uuid().optional(),
    /** Filtra pela ligação com `sales_items.type_service` (PROPRIO / OUTROS). */
    typeService: typeServiceSchema.optional(),
  });

export const createMechanicSalesItemSchema = z
  .object({
    mechanic: z.string().uuid(),
    salesItemsId: z.string().uuid(),
    comissionService: z.number().min(0).max(100).optional(),
  })
  .strict();

export const patchMechanicSalesItemSchema = z
  .object({
    comissionService: z.number().min(0).max(100),
  })
  .strict();

export const mechanicSalesItemParamsSchema = z
  .object({
    mechanicSalesItemId: z
      .string()
      .uuid("Campo 'mechanicSalesItemId' deve ser um UUID valido"),
  })
  .strict();

export type ListMechanicSalesItemsQuery = z.infer<
  typeof listMechanicSalesItemsQuerySchema
>;
export type CreateMechanicSalesItemInput = z.infer<
  typeof createMechanicSalesItemSchema
>;
export type PatchMechanicSalesItemInput = z.infer<
  typeof patchMechanicSalesItemSchema
>;
