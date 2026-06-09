import { z } from "zod";
import {
  createPaginationQuerySchema,
  dateOnlyIsoSchema,
} from "../../shared/validation/common-schemas.js";
import { parseIsoDateOnly } from "../../shared/validation/data-normalizers.js";

const saleTypeSchema = z.enum(["VENDA", "ORCAMENTO"]);
const saleStatusSchema = z.enum(["ABERTA", "FINALIZADA", "CANCELADA"]);
const saleOriginSchema = z.enum(["WEB", "MOBILE"]);

const decimalOpt = z.number().optional();
const percentageOpt = z.number().min(0).max(100).optional();
const monetaryOpt = z.number().min(0).optional();

export const computeItemValueTotal = (
  quantity: number,
  valueUnit: number,
  valueDiscount: number,
  valueAcresce: number,
) => quantity * valueUnit - valueDiscount + valueAcresce;

export const saleItemInputSchema = z
  .object({
    quantity: z.number().positive(),
    valueUnit: z.number().min(0),
    valueDiscount: z.number().min(0).default(0),
    valueAcresce: z.number().min(0).default(0),
    /** Ignorado quando informado; calculado pelo servidor. */
    valueTotal: z.number().min(0).optional(),
    productsEnterprisesId: z.string().uuid(),
    unitId: z.string().uuid(),
    productTypeId: z.string().uuid(),
    stockSectorId: z.string().uuid().optional(),
    stockLocationId: z.string().uuid().optional(),
    stockBatchId: z.string().uuid().optional(),
    /** Vendedor do item; default = vendedor do documento. */
    sellerId: z.string().uuid().optional(),
    /** Canal de lancamento do item; default via header X-Gescom-Client ou WEB. */
    origin: saleOriginSchema.optional(),
  })
  .strict()
  .transform((data) => ({
    ...data,
    valueTotal: computeItemValueTotal(
      data.quantity,
      data.valueUnit,
      data.valueDiscount,
      data.valueAcresce,
    ),
  }));

export const saleDueInputSchema = z
  .object({
    valueInstallment: z.number().positive(),
    dueDate: dateOnlyIsoSchema("dueDate"),
  })
  .strict()
  .transform((data) => ({
    ...data,
    dueDate: parseIsoDateOnly(data.dueDate),
  }));

export const salePaymentInputSchema = z
  .object({
    valueTotal: z.number().positive(),
    paymentTypeId: z.string().uuid(),
    dues: z.array(saleDueInputSchema).min(1),
  })
  .strict();

export const createSaleSchema = z
  .object({
    orderNumber: z.number().int().positive().optional(),
    memberId: z.string().uuid(),
    sellerId: z.string().uuid().optional(),
    type: saleTypeSchema,
    percentageDiscount: decimalOpt,
    discountValuetems: decimalOpt,
    valueDiscountFinancial: decimalOpt,
    percentageAcresce: decimalOpt,
    valueAcresceItems: decimalOpt,
    valueAcresceFinancial: decimalOpt,
    /** Opcional; default ABERTA. Informe FINALIZADA apenas ao criar venda ja fechada (com payments). */
    status: saleStatusSchema.default("ABERTA"),
    /** Canal de fechamento; somente ao criar ja FINALIZADA. */
    origin: saleOriginSchema.optional(),
    items: z.array(saleItemInputSchema).min(1),
    /** Pagamentos e parcelas somente ao criar ja FINALIZADA. */
    payments: z.array(salePaymentInputSchema).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasPayments = (data.payments?.length ?? 0) > 0;
    if (data.status === "FINALIZADA") {
      if (!hasPayments) {
        ctx.addIssue({
          code: "custom",
          path: ["payments"],
          message:
            "Pagamentos e parcelas sao obrigatorios ao finalizar a venda",
        });
      }
      return;
    }
    if (hasPayments) {
      ctx.addIssue({
        code: "custom",
        path: ["payments"],
        message:
          "Pagamentos e parcelas so podem ser informados ao fechar a venda (status FINALIZADA)",
      });
    }
    if (data.origin !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["origin"],
        message:
          "origin so pode ser informado ao fechar a venda (status FINALIZADA)",
      });
    }
  });

export const patchSaleSchema = z
  .object({
    memberId: z.string().uuid().optional(),
    sellerId: z.string().uuid().optional(),
    status: saleStatusSchema.optional(),
    /** Percentual 0–100 sobre subTotal; gera valueDiscountFinancial no recalculo. */
    percentageDiscount: percentageOpt.nullable(),
    discountValuetems: decimalOpt,
    /** Valor monetario manual; gera percentageDiscount no recalculo. Nao enviar com percentageDiscount. */
    valueDiscountFinancial: monetaryOpt,
    /** Percentual 0–100 sobre subTotal; gera valueAcresceFinancial no recalculo. */
    percentageAcresce: percentageOpt.nullable(),
    valueAcresceItems: decimalOpt,
    /** Valor monetario manual; gera percentageAcresce no recalculo. Nao enviar com percentageAcresce. */
    valueAcresceFinancial: monetaryOpt,
    valueLiquid: z.number().min(0).optional(),
    completedionDate: z.coerce.date().nullable().optional(),
    /** Recalcula subTotal (soma dos itens) e valueLiquid a partir dos ajustes do cabecalho. */
    recalculateTotals: z.boolean().optional(),
    /** Pagamentos e parcelas — somente junto com status FINALIZADA. */
    payments: z.array(salePaymentInputSchema).min(1).optional(),
    /** Canal onde a venda foi fechada; somente com status FINALIZADA. */
    origin: saleOriginSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.payments !== undefined && data.status !== "FINALIZADA") {
      ctx.addIssue({
        code: "custom",
        path: ["payments"],
        message:
          "Pagamentos e parcelas so podem ser informados ao fechar a venda (status FINALIZADA)",
      });
    }

    if (
      data.percentageDiscount != null &&
      data.valueDiscountFinancial !== undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["valueDiscountFinancial"],
        message:
          "Informe apenas percentageDiscount ou valueDiscountFinancial, nao ambos",
      });
    }

    if (
      data.percentageAcresce != null &&
      data.valueAcresceFinancial !== undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["valueAcresceFinancial"],
        message:
          "Informe apenas percentageAcresce ou valueAcresceFinancial, nao ambos",
      });
    }

    if (data.origin !== undefined && data.status !== "FINALIZADA") {
      ctx.addIssue({
        code: "custom",
        path: ["origin"],
        message:
          "origin so pode ser informado ao fechar a venda (status FINALIZADA)",
      });
    }
  })
  .refine(
    (data) =>
      Object.entries(data).some(
        ([key, value]) => key !== "recalculateTotals" && value !== undefined,
      ),
    "Deve haver ao menos um campo para atualizar",
  );

export const saleParamsSchema = z
  .object({
    saleId: z.string().uuid("Campo 'saleId' deve ser um UUID valido"),
  })
  .strict();

export const saleItemParamsSchema = z
  .object({
    saleId: z.string().uuid("Campo 'saleId' deve ser um UUID valido"),
    saleItemId: z
      .string()
      .uuid("Campo 'saleItemId' deve ser um UUID valido"),
  })
  .strict();

export const createSaleItemSchema = saleItemInputSchema;

const budgetClosureSituationSchema = z.enum(["ABERTO", "PARCIAL", "FECHADO"]);

export const listSalesQuerySchema = createPaginationQuerySchema(100).extend({
  type: saleTypeSchema.optional(),
  status: saleStatusSchema.optional(),
  budgetClosureSituation: budgetClosureSituationSchema.optional(),
  orderNumber: z.coerce.number().int().positive().optional(),
  /** Minhas vendas/orçamentos: filtra onde sou vendedor (sellerId) ou operador (userId). */
  sellerId: z.string().uuid().optional(),
});

export const patchSaleItemSchema = z
  .object({
    quantity: z.number().positive().optional(),
    valueUnit: z.number().min(0).optional(),
    valueDiscount: z.number().min(0).optional(),
    valueAcresce: z.number().min(0).optional(),
    productsEnterprisesId: z.string().uuid().optional(),
    unitId: z.string().uuid().optional(),
    productTypeId: z.string().uuid().optional(),
    stockSectorId: z.string().uuid().optional(),
    stockLocationId: z.string().uuid().optional(),
    stockBatchId: z.string().uuid().nullable().optional(),
  })
  .strict()
  .refine(
    (data) => Object.values(data).some((v) => v !== undefined),
    "Deve haver ao menos um campo para atualizar",
  );

export const convertBudgetItemInputSchema = z
  .object({
    budgetItemId: z.string().uuid(),
    quantity: z.number().min(0),
    unclosedJustification: z.string().trim().min(1).max(500).optional(),
    stockSectorId: z.string().uuid().optional(),
    stockLocationId: z.string().uuid().optional(),
    stockBatchId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const convertBudgetToSaleSchema = z
  .object({
    status: saleStatusSchema,
    sellerId: z.string().uuid().optional(),
    memberId: z.string().uuid().optional(),
    items: z.array(convertBudgetItemInputSchema).min(1),
    percentageDiscount: decimalOpt,
    discountValuetems: decimalOpt,
    valueDiscountFinancial: decimalOpt,
    percentageAcresce: decimalOpt,
    valueAcresceItems: decimalOpt,
    valueAcresceFinancial: decimalOpt,
    payments: z.array(salePaymentInputSchema).optional(),
    /** Canal de fechamento; somente com status FINALIZADA. */
    origin: saleOriginSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const hasConvertQty = data.items.some((item) => item.quantity > 0);
    if (!hasConvertQty) {
      ctx.addIssue({
        code: "custom",
        path: ["items"],
        message: "Informe ao menos um item com quantidade maior que zero",
      });
    }

    const hasPayments = (data.payments?.length ?? 0) > 0;
    if (data.status === "FINALIZADA") {
      if (!hasPayments) {
        ctx.addIssue({
          code: "custom",
          path: ["payments"],
          message:
            "Pagamentos e parcelas sao obrigatorios ao finalizar a venda",
        });
      }
      return;
    }
    if (data.status === "CANCELADA") {
      ctx.addIssue({
        code: "custom",
        path: ["status"],
        message: "Conversao nao pode gerar venda cancelada",
      });
      return;
    }
    if (hasPayments) {
      ctx.addIssue({
        code: "custom",
        path: ["payments"],
        message:
          "Pagamentos e parcelas so podem ser informados ao fechar a venda (status FINALIZADA)",
      });
    }
    if (data.origin !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["origin"],
        message:
          "origin so pode ser informado ao fechar a venda (status FINALIZADA)",
      });
    }
  });

export type SalePaymentInput = z.infer<typeof salePaymentInputSchema>;
export type CreateSaleInput = z.infer<typeof createSaleSchema>;
export type PatchSaleInput = z.infer<typeof patchSaleSchema>;
export type CreateSaleItemInput = z.infer<typeof createSaleItemSchema>;
export type PatchSaleItemInput = z.infer<typeof patchSaleItemSchema>;
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;
export type ConvertBudgetToSaleInput = z.infer<typeof convertBudgetToSaleSchema>;
