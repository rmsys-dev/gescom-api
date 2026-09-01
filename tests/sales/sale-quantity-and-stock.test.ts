import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ValidationError } from "../../src/shared/errors/app-error.js";
import { assertQuantityMatchesWholeFractional } from "../../src/modules/sales/sale-quantity-logic.js";
import {
  saleItemStockOutRef,
  saleItemStockReturnRef,
  saleItemStockRevisionOutRef,
} from "../../src/modules/sales/sale-stock-refs.js";

describe("sale-quantity-logic", () => {
  it("exige quantidade inteira para unidade INTEIRO", () => {
    assert.throws(
      () =>
        assertQuantityMatchesWholeFractional(1.5, "INTEIRO", "body.items.0"),
      ValidationError,
    );
    assert.doesNotThrow(() =>
      assertQuantityMatchesWholeFractional(2, "INTEIRO", "body.items.0"),
    );
  });
});

describe("sale-stock refs", () => {
  it("gera documentRef estável e idempotente por item", () => {
    assert.equal(
      saleItemStockOutRef("sale-1", "item-1"),
      "SALE:sale-1:ITEM:item-1",
    );
    assert.equal(
      saleItemStockReturnRef("sale-1", "item-1"),
      "SALE-RETURN:sale-1:ITEM:item-1",
    );
    assert.equal(
      saleItemStockRevisionOutRef("sale-1", "item-1", 2),
      "SALE:sale-1:ITEM:item-1:REV:2",
    );
  });
});
