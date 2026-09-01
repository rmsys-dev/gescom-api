import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { mapSaleUniqueViolation } from "../../src/modules/sales/sale-service-shared.js";
import { ConflictError } from "../../src/shared/errors/app-error.js";

describe("sale-service-shared", () => {
  it("mapSaleUniqueViolation traduz constraint de pagamento duplicado", () => {
    const err = {
      code: "23505",
      constraint_name: "sales_payments_sales_id_payment_type_id_unique",
    };
    const mapped = mapSaleUniqueViolation(err);
    assert.ok(mapped instanceof ConflictError);
    assert.equal(mapped?.code, "SALE_PAYMENT_TYPE_DUPLICATE");
  });
});
