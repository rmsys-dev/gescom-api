import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allocateValueLiquidItemsHeader } from "../../../src/modules/sales/sale-item-liquid.js";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

describe("allocateValueLiquidItemsHeader", () => {
  it("rateia desconto final pelo bruto do item sobre o subTotal", () => {
    const result = allocateValueLiquidItemsHeader(
      [
        {
          id: "a",
          quantity: 1,
          valueUnit: 60,
          valueTotal: 58,
        },
      ],
      {
        subTotal: 100,
        valueDiscountFinancial: 5,
        valueAcresceFinancial: 0,
      },
    );

    assert.equal(result[0].valueLiquidItemsHeader, 55);
  });

  it("servico (09) fica 0", () => {
    const result = allocateValueLiquidItemsHeader(
      [
        {
          id: "peca",
          quantity: 1,
          valueUnit: 60,
          valueTotal: 58,
          isService: false,
        },
        {
          id: "serv",
          quantity: 1,
          valueUnit: 40,
          valueTotal: 40,
          typeCode: "09",
        },
      ],
      {
        subTotal: 100,
        valueDiscountFinancial: 5,
        valueAcresceFinancial: 0,
      },
    );

    assert.equal(result[0].valueLiquidItemsHeader, 55);
    assert.equal(result[1].valueLiquidItemsHeader, 0);
  });

  it("aplica acrescimo e desconto finais juntos", () => {
    const result = allocateValueLiquidItemsHeader(
      [{ id: "a", quantity: 1, valueUnit: 200, valueTotal: 200 }],
      {
        subTotal: 200,
        valueDiscountFinancial: 20,
        valueAcresceFinancial: 10,
      },
    );

    assert.equal(result[0].valueLiquidItemsHeader, 190);
  });

  it("um unico item com venda so de peca recebe o liquido da venda", () => {
    const result = allocateValueLiquidItemsHeader(
      [{ id: "a", quantity: 1, valueUnit: 80, valueTotal: 80 }],
      {
        subTotal: 80,
        valueDiscountFinancial: 8,
        valueAcresceFinancial: 0,
      },
    );

    assert.equal(result[0].valueLiquidItemsHeader, 72);
  });

  it("subTotal zerado deixa pecas em 0", () => {
    const result = allocateValueLiquidItemsHeader(
      [{ id: "a", quantity: 1, valueUnit: 0, valueTotal: 0 }],
      {
        subTotal: 0,
        valueDiscountFinancial: 5,
        valueAcresceFinancial: 0,
      },
    );

    assert.equal(result[0].valueLiquidItemsHeader, 0);
  });

  it("ultimo item absorve o resto de centavo", () => {
    const result = allocateValueLiquidItemsHeader(
      [
        { id: "a", quantity: 1, valueUnit: 10, valueTotal: 10 },
        { id: "b", quantity: 1, valueUnit: 10, valueTotal: 10 },
      ],
      {
        subTotal: 20,
        valueDiscountFinancial: 0.01,
        valueAcresceFinancial: 0,
      },
    );

    const sum = roundMoney(
      result.reduce((acc, row) => acc + row.valueLiquidItemsHeader, 0),
    );
    assert.equal(sum, 19.99);
  });
});
