import { z } from "zod";
import { createPaginationQuerySchema } from "../../../shared/validation/common-schemas.js";

const movementTypeSchema = z.enum([
  "ENTRADA",
  "SAIDA",
  "TRANSFERENCIA",
  "AJUSTE",
  "PERDA",
  "VENDA",
  "COMPRA",
  "DEVOLUCAO",
  "CANCELAMENTO",
  "OUTROS",
]);

export const listStockMovementsQuerySchema = createPaginationQuerySchema(
  100,
).extend({
  productsEnterprisesId: z.string().uuid().optional(),
  type: movementTypeSchema.optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const createStockMovementSchema = z
  .object({
    type: movementTypeSchema,
    productsEnterprisesId: z.string().uuid(),
    quantity: z.number().positive(),
    fromStockLocationId: z.string().uuid().optional(),
    fromStockBatchId: z.string().uuid().optional(),
    toStockLocationId: z.string().uuid().optional(),
    toStockBatchId: z.string().uuid().optional(),
    notes: z.string().trim().max(500).optional(),
    documentRef: z.string().trim().max(100).optional(),
    transferGroupId: z.string().uuid().optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.type === "TRANSFERENCIA") {
      if (!data.fromStockLocationId || !data.toStockLocationId) {
        ctx.addIssue({
          code: "custom",
          message:
            "TRANSFERENCIA exige fromStockLocationId e toStockLocationId",
          path: ["fromStockLocationId"],
        });
      } else if (data.fromStockLocationId === data.toStockLocationId) {
        ctx.addIssue({
          code: "custom",
          message: "Locacoes de origem e destino devem ser distintas",
          path: ["toStockLocationId"],
        });
      }
      if (
        (data.fromStockBatchId && !data.toStockBatchId) ||
        (!data.fromStockBatchId && data.toStockBatchId)
      ) {
        ctx.addIssue({
          code: "custom",
          message:
            "TRANSFERENCIA informe fromStockBatchId e toStockBatchId juntos ou omita ambos",
          path: ["fromStockBatchId"],
        });
      }
    }
    const needsFrom = ["SAIDA", "PERDA", "VENDA", "TRANSFERENCIA"].includes(
      data.type,
    );
    const needsTo = [
      "ENTRADA",
      "COMPRA",
      "DEVOLUCAO",
      "TRANSFERENCIA",
      "AJUSTE",
    ].includes(data.type);
    if (needsFrom && !data.fromStockLocationId) {
      ctx.addIssue({
        code: "custom",
        message: `${data.type} exige fromStockLocationId`,
        path: ["fromStockLocationId"],
      });
    }
    if (needsTo && !data.toStockLocationId) {
      ctx.addIssue({
        code: "custom",
        message: `${data.type} exige toStockLocationId`,
        path: ["toStockLocationId"],
      });
    }
  });

export const stockMovementParamsSchema = z
  .object({
    stockMovementId: z
      .string()
      .uuid("Campo 'stockMovementId' deve ser um UUID valido"),
  })
  .strict();

export type CreateStockMovementInput = z.infer<typeof createStockMovementSchema>;
export type ListStockMovementsQuery = z.infer<
  typeof listStockMovementsQuerySchema
>;
