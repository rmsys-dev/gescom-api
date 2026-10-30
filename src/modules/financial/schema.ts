import { z } from "zod";

const dateOnly = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data deve estar em AAAA-MM-DD");

const planLineSchema = z
  .object({
    dueDate: dateOnly,
    amount: z.number().positive(),
  })
  .strict();

const titleStatusSchema = z.enum([
  "ABERTO",
  "PARCIAL",
  "QUITADO",
  "CANCELADO",
  "CONSOLIDADO",
]);

const financialKindSchema = z.enum(["PEDIDO", "NFE", "BOLETO", "AVULSO", "COMPRA"]);

export const listTitlesQuerySchema = z
  .object({
    direction: z.enum(["RECEBER", "PAGAR"]).optional(),
    status: titleStatusSchema.optional(),
    settling: z.literal("1").optional(),
    reversing: z.literal("1").optional(),
    memberId: z.string().uuid().optional(),
    dueFrom: dateOnly.optional(),
    dueTo: dateOnly.optional(),
    /** Data da baixa (pagamento/recebimento). */
    settledFrom: dateOnly.optional(),
    settledTo: dateOnly.optional(),
    kind: financialKindSchema.optional(),
    saleId: z.string().uuid().optional(),
    /** Número do pedido (kind PEDIDO) ou da nota (kind NFE). */
    documentNumber: z.coerce.number().int().positive().optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict()
  .superRefine((data, ctx) => {
    const pair = (
      from: string | undefined,
      to: string | undefined,
      fromPath: "dueFrom" | "settledFrom",
      toPath: "dueTo" | "settledTo",
    ) => {
      if ((from !== undefined) !== (to !== undefined)) {
        ctx.addIssue({
          code: "custom",
          path: [fromPath],
          message: `Informe ${fromPath} e ${toPath} juntos`,
        });
        return;
      }
      if (from && to && from > to) {
        ctx.addIssue({
          code: "custom",
          path: [toPath],
          message: `${toPath} deve ser >= ${fromPath}`,
        });
      }
    };
    pair(data.dueFrom, data.dueTo, "dueFrom", "dueTo");
    pair(data.settledFrom, data.settledTo, "settledFrom", "settledTo");
  });

export const listOpenInstallmentsQuerySchema = z
  .object({
    direction: z.enum(["RECEBER", "PAGAR"]).optional(),
    kind: financialKindSchema.optional(),
    memberId: z.string().uuid().optional(),
    number: z.coerce.number().int().positive().optional(),
    dueFrom: dateOnly.optional(),
    dueTo: dateOnly.optional(),
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
  })
  .strict();

export const summaryQuerySchema = z
  .object({
    direction: z.enum(["RECEBER", "PAGAR"]),
    dateFrom: dateOnly.optional(),
    dateTo: dateOnly.optional(),
    /** Situação dos saldos em aberto. */
    status: titleStatusSchema.optional(),
    /** Situação das baixas (pago/recebido). Sem este campo, conta qualquer situação. */
    settledStatus: titleStatusSchema.optional(),
    kind: financialKindSchema.optional(),
    memberId: z.string().uuid().optional(),
    dueFrom: dateOnly.optional(),
    dueTo: dateOnly.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const pair = (
      from: string | undefined,
      to: string | undefined,
      fromPath: "dateFrom" | "dueFrom",
      toPath: "dateTo" | "dueTo",
    ) => {
      if ((from !== undefined) !== (to !== undefined)) {
        ctx.addIssue({
          code: "custom",
          path: [fromPath],
          message: `Informe ${fromPath} e ${toPath} juntos`,
        });
        return;
      }
      if (from && to && from > to) {
        ctx.addIssue({
          code: "custom",
          path: [toPath],
          message: `${toPath} deve ser >= ${fromPath}`,
        });
      }
    };
    pair(data.dateFrom, data.dateTo, "dateFrom", "dateTo");
    pair(data.dueFrom, data.dueTo, "dueFrom", "dueTo");
  });

export const titleParamsSchema = z
  .object({
    titleId: z.string().uuid(),
  })
  .strict();

export const installmentParamsSchema = z
  .object({
    installmentId: z.string().uuid(),
  })
  .strict();

export const settlementParamsSchema = z
  .object({
    settlementId: z.string().uuid(),
  })
  .strict();

export const agreementParamsSchema = z
  .object({
    agreementId: z.string().uuid(),
  })
  .strict();

export const remittanceParamsSchema = z
  .object({
    remittanceId: z.string().uuid(),
  })
  .strict();

export const createTitleSchema = z
  .object({
    direction: z.enum(["RECEBER", "PAGAR"]),
    memberId: z.string().uuid(),
    description: z.string().trim().min(1).max(500).optional(),
    issueDate: dateOnly,
    installments: z.array(planLineSchema).min(1),
  })
  .strict();

export const billReceivablesSchema = z
  .object({
    saleIds: z.array(z.string().uuid()).min(1),
    kind: z.enum(["NFE", "BOLETO"]),
    nfeHeaderId: z.string().uuid().optional(),
    agreementId: z.string().uuid().optional(),
    installments: z.array(planLineSchema).min(1).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.kind === "NFE" && !value.nfeHeaderId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["nfeHeaderId"],
        message: "Informe a nota fiscal",
      });
    }
    if (value.kind === "BOLETO" && !value.agreementId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["agreementId"],
        message: "Informe o convenio",
      });
    }
    if (value.kind === "BOLETO" && !value.installments?.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["installments"],
        message: "Informe o plano do boleto",
      });
    }
  });

export const issueBoletoSchema = z
  .object({
    agreementId: z.string().uuid(),
    installments: z.array(planLineSchema).min(1),
  })
  .strict();

export const settlementSchema = z
  .object({
    mode: z.enum(["PARCIAL", "INTEGRAL"]),
    amount: z.number().nonnegative(),
    discount: z.number().nonnegative().default(0),
    increase: z.number().nonnegative().default(0),
    settledAt: dateOnly,
    paymentTypesMethodsFlagsId: z.string().uuid(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const integralSettlementSchema = z
  .object({
    installmentIds: z.array(z.string().uuid()).min(1).max(200),
    discount: z.number().nonnegative().default(0),
    increase: z.number().nonnegative().default(0),
    settledAt: dateOnly,
    paymentTypesMethodsFlagsId: z.string().uuid(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const applyCreditSchema = z
  .object({
    creditId: z.string().uuid(),
    amount: z.number().positive(),
  })
  .strict();

export const payableFromNfeSchema = z
  .object({
    nfeHeaderId: z.string().uuid(),
    memberId: z.string().uuid().optional(),
    paymentTypesId: z.string().uuid().optional(),
    installments: z.array(planLineSchema).min(1).optional(),
  })
  .strict();

export const createAgreementSchema = z
  .object({
    bankCode: z.string().trim().length(3),
    branch: z.string().trim().min(1).max(10),
    branchDigit: z.string().trim().max(2).optional(),
    account: z.string().trim().min(1).max(20),
    accountDigit: z.string().trim().max(2).optional(),
    wallet: z.string().trim().min(1).max(10),
    agreementCode: z.string().trim().min(1).max(20),
    walletVariation: z.string().trim().max(10).optional(),
    beneficiaryDocument: z.string().trim().min(11).max(14),
    beneficiaryName: z.string().trim().min(1).max(120),
    channel: z.enum(["API", "CNAB"]),
    cnabLayout: z.enum(["CNAB240", "CNAB400"]).optional(),
    apiProvider: z.string().trim().max(30).optional(),
    credentialRef: z.string().trim().max(120).optional(),
  })
  .strict()
  .superRefine((value, ctx) => {
    if (value.channel === "CNAB" && !value.cnabLayout) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cnabLayout"],
        message: "Informe o layout CNAB",
      });
    }
    if (value.channel === "API" && value.cnabLayout) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["cnabLayout"],
        message: "Convenio de API nao usa layout CNAB",
      });
    }
  });

export const importReturnSchema = z
  .object({
    fileName: z.string().trim().min(1).max(120),
    content: z.string().min(1),
  })
  .strict();

export const webhookParamsSchema = z
  .object({
    provider: z.string().trim().min(1).max(30),
  })
  .strict();

export const webhookSchema = z
  .object({
    nossoNumero: z.string().trim().min(1).max(20),
    paidAmount: z.number().positive(),
    paidAt: dateOnly,
  })
  .strict();

export type ListTitlesQuery = z.infer<typeof listTitlesQuerySchema>;
export type ListOpenInstallmentsQuery = z.infer<typeof listOpenInstallmentsQuerySchema>;
export type SummaryQuery = z.infer<typeof summaryQuerySchema>;
export type CreateTitleInput = z.infer<typeof createTitleSchema>;
export type BillReceivablesInput = z.infer<typeof billReceivablesSchema>;
export type IssueBoletoInput = z.infer<typeof issueBoletoSchema>;
export type SettlementInput = z.infer<typeof settlementSchema>;
export type IntegralSettlementInput = z.infer<typeof integralSettlementSchema>;
export type ApplyCreditInput = z.infer<typeof applyCreditSchema>;
export type PayableFromNfeInput = z.infer<typeof payableFromNfeSchema>;
export type CreateAgreementInput = z.infer<typeof createAgreementSchema>;
export type ImportReturnInput = z.infer<typeof importReturnSchema>;
export type WebhookInput = z.infer<typeof webhookSchema>;
export type PlanLine = z.infer<typeof planLineSchema>;
