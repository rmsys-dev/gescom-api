import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ValidationError } from "../../../src/shared/errors/app-error.js";
import { assertQuantityMatchesWholeFractional } from "../../../src/modules/sales/sale-quantity-logic.js";

describe("assertQuantityMatchesWholeFractional", () => {
  it("INTEIRO aceita quantidade inteira", () => {
    assert.doesNotThrow(() =>
      assertQuantityMatchesWholeFractional(2, "INTEIRO", "body"),
    );
  });

  it("INTEIRO rejeita quantidade decimal", () => {
    assert.throws(
      () => assertQuantityMatchesWholeFractional(1.5, "INTEIRO", "body"),
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.message, "Quantidade invalida");
        assert.deepEqual(err.details, [
          {
            path: "body.quantity",
            message: "Unidade exige quantidade inteira",
          },
        ]);
        return true;
      },
    );
  });

  it("FRACIONADO aceita quantidade decimal", () => {
    assert.doesNotThrow(() =>
      assertQuantityMatchesWholeFractional(1.25, "FRACIONADO", "items.0"),
    );
  });

  it("FRACIONADO aceita quantidade inteira", () => {
    assert.doesNotThrow(() =>
      assertQuantityMatchesWholeFractional(1, "FRACIONADO", "items.0"),
    );
  });
});
