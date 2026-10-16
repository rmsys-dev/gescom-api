import { z } from "zod";
import {
  convertBudgetToOsSchema,
  convertOsToSaleSchema,
  createSaleItemSchema,
  createServiceOrderSchema,
  listSaleSellersQuerySchema,
  listServiceOrdersQuerySchema,
  patchSaleItemSchema,
  patchSaleSchema,
  printSaleQuerySchema,
  saleItemParamsSchema,
} from "../sales/schema.js";

export {
  convertBudgetToOsSchema,
  convertOsToSaleSchema,
  createSaleItemSchema,
  createServiceOrderSchema,
  listSaleSellersQuerySchema,
  listServiceOrdersQuerySchema,
  patchSaleItemSchema,
  patchSaleSchema as patchServiceOrderSchema,
  printSaleQuerySchema,
};

export const serviceOrderParamsSchema = z
  .object({
    serviceOrderId: z.string().uuid("Campo 'serviceOrderId' deve ser um UUID valido"),
  })
  .strict();

export const serviceOrderFromBudgetParamsSchema = z
  .object({
    saleId: z.string().uuid("Campo 'saleId' deve ser um UUID valido"),
  })
  .strict();

export const serviceOrderItemParamsSchema = z
  .object({
    serviceOrderId: z.string().uuid("Campo 'serviceOrderId' deve ser um UUID valido"),
    saleItemId: saleItemParamsSchema.shape.saleItemId,
  })
  .strict();
