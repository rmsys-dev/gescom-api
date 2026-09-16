import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { harbourEventForSaleTransition } from "../../src/modules/sales/harbour-sale-sync-event.js";

describe("harbour-sale-sync", () => {
  it("mapeia transicoes que o legado precisa gravar", () => {
    assert.equal(
      harbourEventForSaleTransition("VENDA", "FINALIZADA"),
      "SALE_FINALIZED",
    );
    assert.equal(
      harbourEventForSaleTransition("ORDEM DE SERVICO", "FINALIZADA"),
      "OS_FINALIZED",
    );
    assert.equal(
      harbourEventForSaleTransition("VENDA", "CANCELADA"),
      "SALE_CANCELLED",
    );
    assert.equal(
      harbourEventForSaleTransition("ORDEM DE SERVICO", "CANCELADA"),
      "OS_CANCELLED",
    );
  });

  it("nao enfileira rascunho ABERTA nem orcamento", () => {
    assert.equal(harbourEventForSaleTransition("VENDA", "ABERTA"), null);
    assert.equal(
      harbourEventForSaleTransition("ORDEM DE SERVICO", "ABERTA"),
      null,
    );
    assert.equal(harbourEventForSaleTransition("ORCAMENTO", "FINALIZADA"), null);
  });
});
