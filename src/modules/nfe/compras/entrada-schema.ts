import { z } from "zod";
import { nfeEntryTransportKindEnum } from "../../../db/schema.js";
import { createProductEnterprisePayloadSchema } from "../../products/products-enterprises/schema.js";

const produtoNovoSchema = createProductEnterprisePayloadSchema
  .omit({ description: true })
  .extend({
    description: z.string().trim().min(1).max(255).optional(),
  });

const itemLancamentoSchema = z
  .object({
    nItem: z.number().int().min(1).max(999999999),
    productsEnterprisesId: z.string().uuid().optional(),
    produto: produtoNovoSchema.optional(),
    precoVenda: z.number().min(0).optional(),
    cfop: z.string().regex(/^\d{4}$/, "CFOP deve ter 4 digitos").optional(),
    pisCst: z.string().regex(/^\d{2}$/, "CST de PIS deve ter 2 digitos").optional(),
    cofinsCst: z.string().regex(/^\d{2}$/, "CST de COFINS deve ter 2 digitos").optional(),
    pisValue: z.number().min(0).optional(),
    cofinsValue: z.number().min(0).optional(),
    toLocationsId: z.string().uuid().optional(),
    toStockBatchId: z.string().uuid().optional(),
  })
  .strict()
  .refine(
    (item) =>
      Number(Boolean(item.productsEnterprisesId)) +
        Number(Boolean(item.produto)) ===
      1,
    "Informe o produto da empresa ou o cadastro novo do item",
  );

const transporteEntradaSchema = z
  .object({
    kind: z.enum(nfeEntryTransportKindEnum.enumValues),
    memberId: z.string().uuid().optional(),
    paid: z.boolean().optional(),
    freightValue: z.number().nonnegative().optional(),
    ipi: z.boolean().optional(),
    calculationBase: z.boolean().optional(),
    incidenceRate: z.number().nonnegative().optional(),
    incidenceValue: z.number().nonnegative().optional(),
    knowledge: z.string().trim().max(20).optional(),
    paymentTypesMethodsFlagsId: z.string().uuid().optional(),
    paidAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Dia do pagamento invalido").optional(),
  })
  .strict();

const pagamentoEntradaSchema = z
  .object({
    paymentTypeId: z.string().uuid(),
    paymentTypesMethodsFlagsId: z.string().uuid(),
    valueTotal: z.number().positive(),
    dues: z
      .array(
        z
          .object({
            dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar em AAAA-MM-DD"),
            valueInstallment: z.number().positive(),
          })
          .strict(),
      )
      .min(1),
  })
  .strict();

export const lancarEntradaSchema = z
  .object({
    memberId: z.string().uuid().optional(),
    pagamentos: z.array(pagamentoEntradaSchema).min(1, "Informe a forma de pagamento"),
    entryDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Data da entrada invalida")
      .optional(),
    transportes: z.array(transporteEntradaSchema).max(2).optional(),
    itens: z.array(itemLancamentoSchema).min(1),
  })
  .strict()
  .superRefine((input, ctx) => {
    const kinds = input.transportes?.map((row) => row.kind) ?? [];
    if (new Set(kinds).size !== kinds.length) {
      ctx.addIssue({
        code: "custom",
        path: ["transportes"],
        message: "Informe no máximo um despacho e um redespacho",
      });
    }
    for (const [index, row] of (input.transportes ?? []).entries()) {
      if ((row.freightValue ?? 0) <= 0) continue;
      if (!row.memberId) {
        ctx.addIssue({
          code: "custom",
          path: ["transportes", index, "memberId"],
          message: "Frete precisa do transportador",
        });
      }
      if (!row.paid) continue;
      if (!row.paymentTypesMethodsFlagsId) {
        ctx.addIssue({
          code: "custom",
          path: ["transportes", index, "paymentTypesMethodsFlagsId"],
          message: "Informe a forma de pagamento do frete",
        });
      }
      if (!row.paidAt) {
        ctx.addIssue({
          code: "custom",
          path: ["transportes", index, "paidAt"],
          message: "Informe o dia do pagamento do frete",
        });
      }
    }
  });

export type LancarEntradaInput = z.infer<typeof lancarEntradaSchema>;
export type LancarEntradaItemInput = LancarEntradaInput["itens"][number];
