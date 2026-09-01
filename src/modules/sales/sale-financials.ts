import { sales, salesItems } from "../../db/schema.js";
import { ValidationError } from "../../shared/errors/app-error.js";
import type { SalePaymentInput } from "./schema.js";
import {
  type BudgetStatus,
  dec,
  decNum,
  decPercentage,
  hasStoredPercentage,
  moneyCents,
  roundMoney,
  toUtcDateKey,
  computeFinancialFromPercentage,
} from "./sale-service-shared.js";

/** Diferença máxima entre % derivado e valor em R$ (arredondamento de centavos). */
const FINANCIAL_ROUNDING_TOLERANCE = 0.02;

const resolveAdjustmentFinancial = (
  subTotal: number,
  percentage: string | null,
  storedValue: string | null,
): { value: number; percentage: string | null } => {
  const stored = decNum(storedValue);
  if (hasStoredPercentage(percentage)) {
    const pct = decNum(percentage);
    const fromPct = computeFinancialFromPercentage(subTotal, pct);
    if (
      stored > 0 &&
      Math.abs(stored - fromPct) <= FINANCIAL_ROUNDING_TOLERANCE
    ) {
      return { value: stored, percentage: null };
    }
    return { value: fromPct, percentage };
  }

  return {
    value: stored,
    percentage: null,
  };
};

export const resolveFinancialAdjustmentsByCategory = (
  sale: Pick<
    typeof sales.$inferSelect,
    | "percentageDiscountProduct"
    | "percentageDiscountService"
    | "percentageAcresceProduct"
    | "percentageAcresceService"
    | "valueDiscountFinancialProduct"
    | "valueDiscountFinancialService"
    | "valueAcresceFinancialProduct"
    | "valueAcresceFinancialService"
  >,
  valueProduct: number,
  valueService: number,
) => {
  const discountProduct = resolveAdjustmentFinancial(
    valueProduct,
    sale.percentageDiscountProduct,
    sale.valueDiscountFinancialProduct,
  );
  const discountService = resolveAdjustmentFinancial(
    valueService,
    sale.percentageDiscountService,
    sale.valueDiscountFinancialService,
  );
  const acresceProduct = resolveAdjustmentFinancial(
    valueProduct,
    sale.percentageAcresceProduct,
    sale.valueAcresceFinancialProduct,
  );
  const acresceService = resolveAdjustmentFinancial(
    valueService,
    sale.percentageAcresceService,
    sale.valueAcresceFinancialService,
  );

  return {
    valueDiscountFinancialProduct: discountProduct.value,
    percentageDiscountProduct: discountProduct.percentage,
    valueDiscountFinancialService: discountService.value,
    percentageDiscountService: discountService.percentage,
    valueAcresceFinancialProduct: acresceProduct.value,
    percentageAcresceProduct: acresceProduct.percentage,
    valueAcresceFinancialService: acresceService.value,
    percentageAcresceService: acresceService.percentage,
  };
};

export type SaleFinancialAdjustmentInput = {
  percentageDiscountProduct?: number | null;
  valueDiscountFinancialProduct?: number;
  percentageDiscountService?: number | null;
  valueDiscountFinancialService?: number;
  percentageAcresceProduct?: number | null;
  valueAcresceFinancialProduct?: number;
  percentageAcresceService?: number | null;
  valueAcresceFinancialService?: number;
};

export const buildSaleFinancialAdjustmentValues = (
  input: SaleFinancialAdjustmentInput,
): Partial<typeof sales.$inferInsert> => {
  const patch: Partial<typeof sales.$inferInsert> = {};
  const pairs = [
    {
      pct: "percentageDiscountProduct" as const,
      val: "valueDiscountFinancialProduct" as const,
    },
    {
      pct: "percentageDiscountService" as const,
      val: "valueDiscountFinancialService" as const,
    },
    {
      pct: "percentageAcresceProduct" as const,
      val: "valueAcresceFinancialProduct" as const,
    },
    {
      pct: "percentageAcresceService" as const,
      val: "valueAcresceFinancialService" as const,
    },
  ];

  for (const { pct, val } of pairs) {
    if (typeof input[pct] === "number") {
      patch[pct] = decPercentage(input[pct]);
    }
    if (input[pct] === null) {
      patch[pct] = null;
    }
    if (input[val] !== undefined) {
      patch[val] = dec(input[val]);
      if (typeof input[pct] !== "number") {
        patch[pct] = null;
      }
    }
  }

  return patch;
};

export const computeValueLiquid = (
  valueProduct: number,
  valueService: number,
  sale: Pick<
    typeof sales.$inferSelect,
    | "valueDiscountFinancialProduct"
    | "valueDiscountFinancialService"
    | "valueAcresceFinancialProduct"
    | "valueAcresceFinancialService"
  >,
) =>
  roundMoney(
    Math.max(
      0,
      valueProduct +
        valueService -
        decNum(sale.valueDiscountFinancialProduct) -
        decNum(sale.valueDiscountFinancialService) +
        decNum(sale.valueAcresceFinancialProduct) +
        decNum(sale.valueAcresceFinancialService),
    ),
  );

export const computeBudgetStatus = (
  items: Pick<
    typeof salesItems.$inferSelect,
    "quantity" | "quantityConverted"
  >[],
): BudgetStatus => {
  if (items.length === 0) return "ABERTA";

  let anyConverted = false;
  let allFullyConverted = true;

  for (const item of items) {
    const qty = decNum(item.quantity);
    const converted = decNum(item.quantityConverted);
    if (converted > 0) anyConverted = true;
    if (converted + 1e-9 < qty) allFullyConverted = false;
  }

  if (allFullyConverted) return "FINALIZADA";
  if (anyConverted) return "PARCIAL";
  return "ABERTA";
};

/** VENDA e ORDEM DE SERVICO compartilham sequência e movimentam estoque de peças. */
export const movesInventory = (saleType: string): boolean =>
  saleType === "VENDA" || saleType === "ORDEM DE SERVICO";

/**
 * Venda gerada a partir de OS já teve baixa na OS; não movimenta estoque de novo.
 */
export const shouldMoveStock = (sale: {
  type: string;
  sourceWorkOrderSaleId?: string | null;
}): boolean => {
  if (sale.sourceWorkOrderSaleId) return false;
  return movesInventory(sale.type);
};

export const assertSalePaymentsMatchSale = (
  valueLiquid: string | number | null,
  saleCreatedAt: Date,
  payments: SalePaymentInput[],
) => {
  const issues: { path: string; message: string }[] = [];

  if (valueLiquid === null || valueLiquid === "") {
    issues.push({
      path: "body.valueLiquid",
      message:
        "Valor liquido da venda e obrigatorio para fechar com pagamentos",
    });
  }

  const liquidCents = moneyCents(
    typeof valueLiquid === "number" ? valueLiquid : decNum(valueLiquid),
  );
  const saleDayKey = toUtcDateKey(saleCreatedAt);

  const paymentTypeIds = new Set<string>();
  let paymentsSumCents = 0;

  for (let pIdx = 0; pIdx < payments.length; pIdx++) {
    const payment = payments[pIdx];
    const paymentPath = `body.payments.${pIdx}`;

    if (paymentTypeIds.has(payment.paymentTypeId)) {
      issues.push({
        path: `${paymentPath}.paymentTypeId`,
        message: "Tipo de pagamento duplicado na mesma venda",
      });
    }
    paymentTypeIds.add(payment.paymentTypeId);

    paymentsSumCents += moneyCents(payment.valueTotal);

    let duesSumCents = 0;
    const dueDateKeys = new Set<string>();

    for (let dIdx = 0; dIdx < payment.dues.length; dIdx++) {
      const due = payment.dues[dIdx];
      const duePath = `${paymentPath}.dues.${dIdx}`;

      duesSumCents += moneyCents(due.valueInstallment);

      const dueDayKey = toUtcDateKey(due.dueDate);
      if (dueDateKeys.has(dueDayKey)) {
        issues.push({
          path: `${duePath}.dueDate`,
          message: "Data de vencimento duplicada para o mesmo pagamento",
        });
      }
      dueDateKeys.add(dueDayKey);

      if (dueDayKey < saleDayKey) {
        issues.push({
          path: `${duePath}.dueDate`,
          message:
            "Data de vencimento nao pode ser anterior a data de criacao da venda",
        });
      }
    }

    if (duesSumCents !== moneyCents(payment.valueTotal)) {
      issues.push({
        path: `${paymentPath}.dues`,
        message:
          "Soma das parcelas deve ser igual ao valor total do pagamento",
      });
    }
  }

  if (paymentsSumCents !== liquidCents) {
    issues.push({
      path: "body.payments",
      message: "Soma dos pagamentos deve ser igual ao valor liquido da venda",
    });
  }

  if (issues.length > 0) {
    throw new ValidationError(issues, "Pagamentos invalidos");
  }
};
