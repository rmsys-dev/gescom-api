import { z } from "zod";
import {
  createPaginationQuerySchema,
  dateOnlyIsoSchema,
} from "../../shared/validation/common-schemas.js";

const listSaleTypeSchema = z.enum([
  "VENDA",
  "ORCAMENTO",
  "ORDEM DE SERVICO",
  "DEVOLUCAO",
]);

const saleStatusSchema = z.enum([
  "ABERTA",
  "FINALIZADA",
  "CANCELADA",
  "INATIVA",
  "PARCIAL",
]);

export const listMigrationSalesQuerySchema = createPaginationQuerySchema(100)
  .extend({
    type: listSaleTypeSchema.optional(),
    status: saleStatusSchema.optional(),
    dateFrom: dateOnlyIsoSchema("dateFrom").optional(),
    dateTo: dateOnlyIsoSchema("dateTo").optional(),
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

export type ListMigrationSalesQuery = z.infer<
  typeof listMigrationSalesQuerySchema
>;
