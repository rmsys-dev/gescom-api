import { z } from "zod";
import {
  cpfCnpjSchema,
  createPaginationQuerySchema,
  dateOnlyIsoSchema,
  optionalTrimmedStringSchema,
} from "../../shared/validation/common-schemas.js";
import { parseIsoDateOnly } from "../../shared/validation/data-normalizers.js";

const saleTypeSchema = z.enum(["VENDA", "ORCAMENTO", "ORDEM DE SERVICO"]);
/** Tipos aceites no filtro de listagem (enum DB `sale_type`). */
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
const saleOriginSchema = z.enum(["WEB", "MOBILE"]);
const orderServiceModelSchema = z.enum(["VEICULO"]);

const decimalOpt = z.number().optional();
const percentageOpt = z.number().min(0).max(100).optional();
const monetaryOpt = z.number().min(0).optional();

const saleServiceTypeSchema = z.enum(["SERVICO", "GARANTIA"]);
/** Tipo do serviço no item (PROPRIO / OUTROS); default PROPRIO no banco. */
const typeServiceSchema = z.enum(["PROPRIO", "OUTROS"]);

const saleServiceFieldsSchema = {
  vehicleMileage: z.number().int().min(0).optional(),
  observations: z.string().trim().max(500).optional(),
  defect: z.string().trim().max(500).optional(),
  /** Somente para ORDEM DE SERVICO; demais tipos devem omitir (DB default SERVICO). */
  serviceType: saleServiceTypeSchema.optional(),
  /** Modelo de OS; tipicamente VEICULO. Default VEICULO quando type = ORDEM DE SERVICO. */
  modelService: orderServiceModelSchema.optional(),
  /** Vinculo veiculo × membro; obrigatorio na criacao de ORDEM DE SERVICO. */
  vehiclesEnterprisesMembersId: z.string().uuid().optional(),
};

const saleFinancialAdjustmentsSchema = {
  percentageDiscountProduct: decimalOpt,
  valueDiscountFinancialProduct: decimalOpt,
  percentageDiscountService: decimalOpt,
  valueDiscountFinancialService: decimalOpt,
  percentageAcresceProduct: decimalOpt,
  valueAcresceFinancialProduct: decimalOpt,
  percentageAcresceService: decimalOpt,
  valueAcresceFinancialService: decimalOpt,
};

/** Clientes legados ainda enviam `*Pie` (peças); API usa `*Product`. */
const LEGACY_PIE_TO_PRODUCT_KEYS: Readonly<Record<string, string>> = {
  percentageDiscountPie: "percentageDiscountProduct",
  valueDiscountFinancialPie: "valueDiscountFinancialProduct",
  percentageAcrescePie: "percentageAcresceProduct",
  valueAcresceFinancialPie: "valueAcresceFinancialProduct",
  valuePie: "valueProduct",
};

const mapLegacyPieFields = (raw: unknown): unknown => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const data = { ...(raw as Record<string, unknown>) };
  for (const [from, to] of Object.entries(LEGACY_PIE_TO_PRODUCT_KEYS)) {
    if (data[from] !== undefined) {
      if (data[to] === undefined) data[to] = data[from];
      delete data[from];
    }
  }
  return data;
};

const patchSaleFinancialAdjustmentsSchema = {
  /** Percentual 0–100 sobre valueProduct; gera valueDiscountFinancialProduct no recalculo. */
  percentageDiscountProduct: percentageOpt.nullable(),
  valueDiscountFinancialProduct: monetaryOpt,
  /** Percentual 0–100 sobre valueService; gera valueDiscountFinancialService no recalculo. */
  percentageDiscountService: percentageOpt.nullable(),
  valueDiscountFinancialService: monetaryOpt,
  /** Percentual 0–100 sobre valueProduct; gera valueAcresceFinancialProduct no recalculo. */
  percentageAcresceProduct: percentageOpt.nullable(),
  valueAcresceFinancialProduct: monetaryOpt,
  /** Percentual 0–100 sobre valueService; gera valueAcresceFinancialService no recalculo. */
  percentageAcresceService: percentageOpt.nullable(),
  valueAcresceFinancialService: monetaryOpt,
};

const assertExclusivePercentageOrValue = (
  data: Record<string, unknown>,
  ctx: z.RefinementCtx,
  percentageKey: string,
  valueKey: string,
) => {
  if (data[percentageKey] != null && data[valueKey] !== undefined) {
    ctx.addIssue({
      code: "custom",
      path: [valueKey],
      message: `Informe apenas ${percentageKey} ou ${valueKey}, nao ambos`,
    });
  }
};

const refineSaleFinancialAdjustments = (
  data: Record<string, unknown>,
  ctx: z.RefinementCtx,
) => {
  assertExclusivePercentageOrValue(
    data,
    ctx,
    "percentageDiscountProduct",
    "valueDiscountFinancialProduct",
  );
  assertExclusivePercentageOrValue(
    data,
    ctx,
    "percentageDiscountService",
    "valueDiscountFinancialService",
  );
  assertExclusivePercentageOrValue(
    data,
    ctx,
    "percentageAcresceProduct",
    "valueAcresceFinancialProduct",
  );
  assertExclusivePercentageOrValue(
    data,
    ctx,
    "percentageAcresceService",
    "valueAcresceFinancialService",
  );
};

export const computeItemValueTotal = (
  quantity: number,
  valueUnit: number,
  valueDiscount: number,
  valueAcresce: number,
) => quantity * valueUnit - valueDiscount + valueAcresce;

/** Mecanico com comissao de servico no item (OS). */
export const saleItemMechanicInputSchema = z
  .object({
    mechanic: z.string().uuid(),
    /** Percentual 0–100; omitido usa default do banco (0.00). */
    comissionService: z.number().min(0).max(100).optional(),
  })
  .strict();

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
    sectorId: z.string().uuid().optional(),
    locationsId: z.string().uuid().optional(),
    stockBatchId: z.string().uuid().optional(),
    /** Vendedor do item; default = vendedor do documento. */
    sellerId: z.string().uuid().optional(),
    /** Canal de lancamento do item; default via header X-Gescom-Client ou WEB. */
    origin: saleOriginSchema.optional(),
    /**
     * Mecanicos do item (comissao de servico).
     * Somente em ORDEM DE SERVICO; grava em mechanic_sales_items.
     */
    mechanics: z.array(saleItemMechanicInputSchema).min(1).optional(),
    /**
     * Descrição livre do item (serviço em orçamento/OS).
     * Null/omitido = usa a descrição do cadastro do produto.
     */
    description: z.string().trim().min(1).max(255).nullable().optional(),
    /**
     * Tipo do serviço no item (PROPRIO / OUTROS).
     * Somente em item de serviço; omitido = PROPRIO no banco.
     */
    typeService: typeServiceSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (!data.mechanics?.length) return;
    const seen = new Set<string>();
    for (let i = 0; i < data.mechanics.length; i++) {
      const id = data.mechanics[i].mechanic;
      if (seen.has(id)) {
        ctx.addIssue({
          code: "custom",
          path: ["mechanics", i, "mechanic"],
          message: "Mecanico duplicado no mesmo item",
        });
      }
      seen.add(id);
    }
  })
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

const saleMemberCepSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }
  const digits = value.replace(/\D/g, "");
  return digits === "" ? undefined : digits;
}, z.string().length(8, "Campo 'memberCep' deve conter 8 digitos").optional());

const saleMemberStateSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, z.string().length(2, "Campo 'memberState' deve ter 2 caracteres").optional());

const optionalRegistrationSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}, cpfCnpjSchema("registration").optional());

/** Overrides parciais do snapshot do cliente na venda (sales_members). */
export const saleMemberOverrideSchema = z
  .object({
    memberLegalName: optionalTrimmedStringSchema("memberLegalName", 255),
    memberAddress: optionalTrimmedStringSchema("memberAddress", 255),
    memberCep: saleMemberCepSchema,
    memberCity: optionalTrimmedStringSchema("memberCity", 255),
    memberState: saleMemberStateSchema,
    registration: optionalRegistrationSchema,
    memberPhone: optionalTrimmedStringSchema("memberPhone", 20),
    memberMobile: optionalTrimmedStringSchema("memberMobile", 20),
  })
  .strict();

const createSaleObjectSchema = z
  .object({
    orderNumber: z.number().int().positive().optional(),
    memberId: z.string().uuid(),
    sellerId: z.string().uuid().optional(),
    type: saleTypeSchema,
    discountValuetems: decimalOpt,
    valueAcresceItems: decimalOpt,
    ...saleFinancialAdjustmentsSchema,
    ...saleServiceFieldsSchema,
    /** Obrigatorio apenas em ORDEM DE SERVICO (ver superRefine). */
    vehiclesEnterprisesMembersId: z.string().uuid().optional(),
    /** Opcional; default ABERTA. Informe FINALIZADA apenas ao criar venda ja fechada (com payments). */
    status: saleStatusSchema.default("ABERTA"),
    /**
     * Canal de fechamento. Persistido somente com status FINALIZADA;
     * em ABERTA e aceito e ignorado (clientes enviam WEB por padrao).
     */
    origin: saleOriginSchema.optional(),
    items: z.array(saleItemInputSchema).min(1),
    /** Pagamentos e parcelas somente ao criar ja FINALIZADA. */
    payments: z.array(salePaymentInputSchema).optional(),
    /** Overrides opcionais do snapshot do cliente (sales_members). */
    member: saleMemberOverrideSchema.optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (
      data.type === "ORDEM DE SERVICO" &&
      data.vehiclesEnterprisesMembersId === undefined
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["vehiclesEnterprisesMembersId"],
        message:
          "vehiclesEnterprisesMembersId e obrigatorio em ORDEM DE SERVICO",
      });
    }

    if (data.type !== "ORDEM DE SERVICO" && data.serviceType !== undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["serviceType"],
        message:
          "serviceType so pode ser informado em ORDEM DE SERVICO; omita o campo",
      });
    }

    if (data.type !== "ORDEM DE SERVICO") {
      for (let i = 0; i < data.items.length; i++) {
        if (data.items[i].mechanics?.length) {
          ctx.addIssue({
            code: "custom",
            path: ["items", i, "mechanics"],
            message:
              "mechanics so pode ser informado em ORDEM DE SERVICO; omita o campo",
          });
        }
      }
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
    if (hasPayments) {
      ctx.addIssue({
        code: "custom",
        path: ["payments"],
        message:
          "Pagamentos e parcelas so podem ser informados ao fechar a venda (status FINALIZADA)",
      });
    }
  });

export const createSaleSchema = z.preprocess(
  mapLegacyPieFields,
  createSaleObjectSchema,
);

const patchSaleObjectSchema = z
  .object({
    memberId: z.string().uuid().optional(),
    sellerId: z.string().uuid().optional(),
    status: saleStatusSchema.optional(),
    discountValuetems: decimalOpt,
    valueAcresceItems: decimalOpt,
    ...patchSaleFinancialAdjustmentsSchema,
    ...saleServiceFieldsSchema,
    vehiclesEnterprisesMembersId: z.string().uuid().optional(),
    valueLiquid: z.number().min(0).optional(),
    completedionDate: z.coerce.date().nullable().optional(),
    /** Recalcula subTotal (soma dos itens) e valueLiquid a partir dos ajustes do cabecalho. */
    recalculateTotals: z.boolean().optional(),
    /** Pagamentos e parcelas — somente junto com status FINALIZADA. */
    payments: z.array(salePaymentInputSchema).min(1).optional(),
    /**
     * Canal de fechamento. Persistido somente com status FINALIZADA;
     * caso contrario e aceito e ignorado.
     */
    origin: saleOriginSchema.optional(),
    /** Overrides opcionais do snapshot do cliente (sales_members). */
    member: saleMemberOverrideSchema.optional(),
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

    refineSaleFinancialAdjustments(data, ctx);
  })
  .refine(
    (data) =>
      Object.entries(data).some(
        ([key, value]) => key !== "recalculateTotals" && value !== undefined,
      ),
    "Deve haver ao menos um campo para atualizar",
  );

export const patchSaleSchema = z.preprocess(
  mapLegacyPieFields,
  patchSaleObjectSchema,
);

export const saleParamsSchema = z
  .object({
    saleId: z.string().uuid("Campo 'saleId' deve ser um UUID valido"),
  })
  .strict();

export const printSaleQuerySchema = z
  .object({
    format: z.enum(["pdf", "html"]).optional(),
    autoPrint: z.enum(["0", "1"]).optional(),
  })
  .strict();
export type PrintSaleQuery = z.infer<typeof printSaleQuerySchema>;

export const saleItemParamsSchema = z
  .object({
    saleId: z.string().uuid("Campo 'saleId' deve ser um UUID valido"),
    saleItemId: z.string().uuid("Campo 'saleItemId' deve ser um UUID valido"),
  })
  .strict();

export const createSaleItemSchema = saleItemInputSchema;

export const listSalesQuerySchema = createPaginationQuerySchema(100)
  .extend({
    /** Filtra por tipo (`VENDA`, `ORCAMENTO`, `ORDEM DE SERVICO` ou `DEVOLUCAO`). */
    type: listSaleTypeSchema.optional(),
    /** Inclui PARCIAL para orçamentos parcialmente convertidos. */
    status: saleStatusSchema.optional(),
    userId: z.string().uuid().optional(),
    sellerId: z.string().uuid().optional(),
    memberId: z.string().uuid().optional(),
    vehiclesEnterprisesMembersId: z.string().uuid().optional(),
    orderNumber: z.coerce.number().int().positive().optional(),
    seller: optionalTrimmedStringSchema("seller", 255).optional(),
    client: optionalTrimmedStringSchema("client", 255).optional(),
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

export const patchSaleItemSchema = z
  .object({
    quantity: z.number().positive().optional(),
    valueUnit: z.number().min(0).optional(),
    valueDiscount: z.number().min(0).optional(),
    valueAcresce: z.number().min(0).optional(),
    productsEnterprisesId: z.string().uuid().optional(),
    unitId: z.string().uuid().optional(),
    productTypeId: z.string().uuid().optional(),
    sectorId: z.string().uuid().optional(),
    locationsId: z.string().uuid().optional(),
    stockBatchId: z.string().uuid().nullable().optional(),
    /** Descrição livre (serviço); null limpa e volta ao cadastro do produto. */
    description: z.string().trim().min(1).max(255).nullable().optional(),
    /** Tipo do serviço (PROPRIO / OUTROS); somente em item de serviço. */
    typeService: typeServiceSchema.optional(),
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
    sectorId: z.string().uuid().optional(),
    locationsId: z.string().uuid().optional(),
    stockBatchId: z.string().uuid().nullable().optional(),
  })
  .strict();

export const convertBudgetToSaleSchema = z.preprocess(
  mapLegacyPieFields,
  z
    .object({
      status: saleStatusSchema,
      sellerId: z.string().uuid().optional(),
      memberId: z.string().uuid().optional(),
      items: z.array(convertBudgetItemInputSchema).min(1),
      discountValuetems: decimalOpt,
      valueAcresceItems: decimalOpt,
      ...saleFinancialAdjustmentsSchema,
      ...saleServiceFieldsSchema,
      payments: z.array(salePaymentInputSchema).optional(),
      /**
       * Canal de fechamento. Persistido somente com status FINALIZADA;
       * caso contrario e aceito e ignorado.
       */
      origin: saleOriginSchema.optional(),
      /** Overrides opcionais do snapshot do cliente (sales_members). */
      member: saleMemberOverrideSchema.optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.serviceType !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["serviceType"],
          message: "serviceType nao se aplica a venda; omita o campo",
        });
      }

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
    }),
);

/** Converte orçamento com serviço em OS aberta (sem pagamento neste passo). */
export const convertBudgetToOsSchema = z.preprocess(
  mapLegacyPieFields,
  z
    .object({
      sellerId: z.string().uuid().optional(),
      memberId: z.string().uuid().optional(),
      items: z.array(convertBudgetItemInputSchema).min(1),
      discountValuetems: decimalOpt,
      valueAcresceItems: decimalOpt,
      ...saleFinancialAdjustmentsSchema,
      ...saleServiceFieldsSchema,
      member: saleMemberOverrideSchema.optional(),
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
    }),
);

export const convertOsItemInputSchema = z
  .object({
    workOrderItemId: z.string().uuid(),
    quantity: z.number().min(0),
    unclosedJustification: z.string().trim().min(1).max(500).optional(),
    sectorId: z.string().uuid().optional(),
    locationsId: z.string().uuid().optional(),
    stockBatchId: z.string().uuid().nullable().optional(),
  })
  .strict();

/** Converte OS em venda (documento novo; sem nova baixa de estoque). */
export const convertOsToSaleSchema = z.preprocess(
  mapLegacyPieFields,
  z
    .object({
      status: saleStatusSchema,
      sellerId: z.string().uuid().optional(),
      memberId: z.string().uuid().optional(),
      items: z.array(convertOsItemInputSchema).min(1),
      discountValuetems: decimalOpt,
      valueAcresceItems: decimalOpt,
      ...saleFinancialAdjustmentsSchema,
      ...saleServiceFieldsSchema,
      payments: z.array(salePaymentInputSchema).optional(),
      origin: saleOriginSchema.optional(),
      member: saleMemberOverrideSchema.optional(),
    })
    .strict()
    .superRefine((data, ctx) => {
      if (data.serviceType !== undefined) {
        ctx.addIssue({
          code: "custom",
          path: ["serviceType"],
          message:
            "serviceType nao se aplica a venda; omita o campo (permanece na OS de origem)",
        });
      }

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
    }),
);

export type SalePaymentInput = z.infer<typeof salePaymentInputSchema>;
export type SaleMemberOverrideInput = z.infer<typeof saleMemberOverrideSchema>;
export type CreateSaleInput = z.infer<typeof createSaleObjectSchema>;
export type PatchSaleInput = z.infer<typeof patchSaleObjectSchema>;
export type CreateSaleItemInput = z.infer<typeof createSaleItemSchema>;
export type PatchSaleItemInput = z.infer<typeof patchSaleItemSchema>;
export type ListSalesQuery = z.infer<typeof listSalesQuerySchema>;
export type ConvertBudgetToSaleInput = z.output<
  typeof convertBudgetToSaleSchema
>;
export type ConvertBudgetToOsInput = z.output<typeof convertBudgetToOsSchema>;
export type ConvertOsToSaleInput = z.output<typeof convertOsToSaleSchema>;
