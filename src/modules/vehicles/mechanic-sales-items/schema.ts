import { z } from "zod";
import {
  createPaginationQuerySchema,
  dateOnlyIsoSchema,
} from "../../../shared/validation/common-schemas.js";

const typeServiceSchema = z.enum(["PROPRIO", "OUTROS"]);
const mechanicCommissionStatusSchema = z.enum([
  "ABERTA",
  "FINALIZADA",
  "CANCELADA",
  "INATIVA",
]);

export const listMechanicSalesItemsQuerySchema =
  createPaginationQuerySchema(100)
    .extend({
      mechanic: z.string().uuid().optional(),
      salesItemsId: z.string().uuid().optional(),
      saleId: z.string().uuid().optional(),
      /** Filtra pela ligação com `sales_items.type_service` (PROPRIO / OUTROS). */
      typeService: typeServiceSchema.optional(),
      /** Situação da ordem. Omitido devolve todas. */
      status: mechanicCommissionStatusSchema.optional(),
      dateFrom: dateOnlyIsoSchema("dateFrom").optional(),
      dateTo: dateOnlyIsoSchema("dateTo").optional(),
      /** Só ordem de serviço com item tipo 09. */
      servicesOnly: z.enum(["true", "false"]).optional(),
    })
    .superRefine((data, ctx) => {
      const hasFrom = data.dateFrom !== undefined;
      const hasTo = data.dateTo !== undefined;
      if (hasFrom !== hasTo) {
        ctx.addIssue({
          code: "custom",
          path: hasFrom ? ["dateTo"] : ["dateFrom"],
          message: "Informe dateFrom e dateTo juntos",
        });
        return;
      }
      if (data.dateFrom && data.dateTo && data.dateFrom > data.dateTo) {
        ctx.addIssue({
          code: "custom",
          path: ["dateTo"],
          message: "dateTo deve ser >= dateFrom",
        });
      }
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
