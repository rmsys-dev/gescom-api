import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ValidationError } from "../../src/shared/errors/app-error.js";
import {
  assertSalePaymentsMatchSale,
  computeBudgetStatus,
  computeValueLiquid,
  movesInventory,
  resolveFinancialAdjustmentsByCategory,
  shouldMoveStock,
} from "../../src/modules/sales/sale-financials.js";

describe("sale-financials", () => {
  it("computeBudgetStatus reflete conversão parcial e total", () => {
    assert.equal(
      computeBudgetStatus([{ quantity: "10", quantityConverted: "0" }]),
      "ABERTA",
    );
    assert.equal(
      computeBudgetStatus([{ quantity: "10", quantityConverted: "4" }]),
      "PARCIAL",
    );
    assert.equal(
      computeBudgetStatus([{ quantity: "10", quantityConverted: "10" }]),
      "FINALIZADA",
    );
  });

  it("computeValueLiquid aplica descontos e acréscimos por categoria", () => {
    const liquid = computeValueLiquid(100, 50, {
      valueDiscountFinancialProduct: "10",
      valueDiscountFinancialService: "5",
      valueAcresceFinancialProduct: "2",
      valueAcresceFinancialService: "1",
    });
    assert.equal(liquid, 138);
  });

  it("resolveFinancialAdjustmentsByCategory prioriza percentual", () => {
    const result = resolveFinancialAdjustmentsByCategory(
      {
        percentageDiscountProduct: "10",
        valueDiscountFinancialProduct: "10",
        percentageDiscountService: null,
        valueDiscountFinancialService: "0",
        percentageAcresceProduct: null,
        valueAcresceFinancialProduct: "0",
        percentageAcresceService: null,
        valueAcresceFinancialService: "0",
      },
      200,
      0,
    );
    assert.equal(result.valueDiscountFinancialProduct, 20);
  });

  it("shouldMoveStock ignora venda gerada a partir de OS", () => {
    assert.equal(
      shouldMoveStock({ type: "VENDA", sourceWorkOrderSaleId: "os-1" }),
      false,
    );
    assert.equal(shouldMoveStock({ type: "VENDA" }), true);
    assert.equal(movesInventory("ORCAMENTO"), false);
  });

  it("assertSalePaymentsMatchSale rejeita soma divergente", () => {
    assert.throws(
      () =>
        assertSalePaymentsMatchSale(
          100,
          new Date("2026-01-15T12:00:00.000Z"),
          [
            {
              paymentTypeId: "pt-1",
              valueTotal: 90,
              dues: [
                {
                  valueInstallment: 90,
                  dueDate: new Date("2026-01-20T12:00:00.000Z"),
                },
              ],
            },
          ],
        ),
      ValidationError,
    );
  });

  it("assertSalePaymentsMatchSale aceita pagamentos balanceados", () => {
    assert.doesNotThrow(() =>
      assertSalePaymentsMatchSale(
        100,
        new Date("2026-01-15T12:00:00.000Z"),
        [
          {
            paymentTypeId: "pt-1",
            valueTotal: 100,
            dues: [
              {
                valueInstallment: 100,
                dueDate: new Date("2026-01-20T12:00:00.000Z"),
              },
            ],
          },
        ],
      ),
    );
  });
});
