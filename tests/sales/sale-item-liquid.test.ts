import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { allocateValueLiquidItemsHeader } from "../../src/modules/sales/sale-item-liquid.js";

describe("sale-item-liquid", () => {
  it("zera líquido de itens de serviço", () => {
    const result = allocateValueLiquidItemsHeader(
      [
        {
          id: "svc",
          quantity: 1,
          valueUnit: 100,
          valueTotal: 100,
          typeCode: "09",
        },
        {
          id: "prd",
          quantity: 2,
          valueUnit: 50,
          valueTotal: 100,
          typeCode: "01",
        },
      ],
      {
        subTotal: 200,
        valueDiscountFinancial: 20,
        valueAcresceFinancial: 0,
      },
    );

    const byId = Object.fromEntries(
      result.map((row) => [row.id, row.valueLiquidItemsHeader]),
    );
    assert.equal(byId.svc, 0);
    assert.equal(byId.prd, 90);
  });

  it("distribui acréscimo proporcionalmente ao bruto", () => {
    const result = allocateValueLiquidItemsHeader(
      [
        {
          id: "a",
          quantity: 1,
          valueUnit: 100,
          valueTotal: 100,
        },
        {
          id: "b",
          quantity: 1,
          valueUnit: 100,
          valueTotal: 100,
        },
      ],
      {
        subTotal: 200,
        valueDiscountFinancial: 0,
        valueAcresceFinancial: 20,
      },
    );

    const total = result.reduce(
      (sum, row) => sum + row.valueLiquidItemsHeader,
      0,
    );
    assert.equal(total, 220);
  });
});
