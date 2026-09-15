import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ValidationError } from "../../src/shared/errors/app-error.js";
import { shouldMoveStock } from "../../src/modules/sales/sale-financials.js";
import {
  assertOsEligibleForEstorno,
  generatedSaleCancelMovesStock,
  OS_ESTORNO_MOVES_STOCK,
  planOsEstorno,
} from "../../src/modules/sales/os-estorno.js";

const finalizedOs = {
  type: "ORDEM DE SERVICO",
  status: "FINALIZADA",
};

const generatedSale = {
  id: "venda-1",
  status: "FINALIZADA",
  returnSituation: "SEM_DEVOLUCAO",
  sourceWorkOrderSaleId: "os-1",
};

describe("os-estorno", () => {
  it("recusa tipo diferente de ORDEM DE SERVICO", () => {
    assert.throws(
      () =>
        assertOsEligibleForEstorno(
          { type: "VENDA", status: "FINALIZADA" },
          [generatedSale],
        ),
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.message, "Tipo invalido");
        return true;
      },
    );
  });

  it("recusa OS que nao esta FINALIZADA", () => {
    assert.throws(
      () =>
        assertOsEligibleForEstorno(
          { type: "ORDEM DE SERVICO", status: "ABERTA" },
          [generatedSale],
        ),
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.message, "Status invalido");
        return true;
      },
    );
    assert.throws(
      () =>
        assertOsEligibleForEstorno(
          { type: "ORDEM DE SERVICO", status: "PARCIAL" },
          [generatedSale],
        ),
      ValidationError,
    );
  });

  it("recusa OS finalizada sem venda gerada", () => {
    assert.throws(
      () => assertOsEligibleForEstorno(finalizedOs, []),
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.message, "Venda vinculada obrigatoria");
        return true;
      },
    );
  });

  it("recusa venda gerada com devolucao", () => {
    assert.throws(
      () =>
        assertOsEligibleForEstorno(finalizedOs, [
          {
            ...generatedSale,
            returnSituation: "PARCIAL",
          },
        ]),
      (err: unknown) => {
        assert.ok(err instanceof ValidationError);
        assert.equal(err.message, "Devolucao existente");
        return true;
      },
    );
    assert.throws(
      () =>
        assertOsEligibleForEstorno(finalizedOs, [
          {
            ...generatedSale,
            returnSituation: "TOTAL",
          },
        ]),
      ValidationError,
    );
  });

  it("cancela a venda gerada, reabre a OS e nao movimenta estoque", () => {
    const plan = planOsEstorno(finalizedOs, [generatedSale]);

    assert.equal(plan.workOrderUpdate.status, "ABERTA");
    assert.equal(plan.workOrderUpdate.completedionDate, null);
    assert.equal(plan.workOrderUpdate.userClosedServiceId, null);
    assert.equal(plan.itemUpdate.quantityConverted, "0.0000");
    assert.deepEqual(plan.salesToCancel, [
      {
        id: "venda-1",
        status: "CANCELADA",
        returnSituation: "SEM_DEVOLUCAO",
        sourceWorkOrderSaleId: null,
      },
    ]);
    assert.deepEqual(plan.salesToUnlink, [
      {
        id: "venda-1",
        sourceWorkOrderSaleId: null,
      },
    ]);
    assert.deepEqual(plan.generatedItemUnlink, {
      sourceWorkOrderItemId: null,
    });
    assert.equal(plan.movesStock, false);
    assert.equal(OS_ESTORNO_MOVES_STOCK, false);
    assert.equal(generatedSaleCancelMovesStock(generatedSale), false);
    assert.equal(
      shouldMoveStock({
        type: "VENDA",
        sourceWorkOrderSaleId: generatedSale.sourceWorkOrderSaleId,
      }),
      false,
    );
  });

  it("nao recancela venda gerada ja CANCELADA", () => {
    const plan = planOsEstorno(finalizedOs, [
      {
        ...generatedSale,
        status: "CANCELADA",
      },
      {
        id: "venda-2",
        status: "PARCIAL",
        returnSituation: "SEM_DEVOLUCAO",
        sourceWorkOrderSaleId: "os-1",
      },
    ]);

    assert.deepEqual(
      plan.salesToCancel.map((sale) => sale.id),
      ["venda-2"],
    );
    assert.deepEqual(
      plan.salesToUnlink.map((sale) => sale.id),
      ["venda-1", "venda-2"],
    );
    assert.equal(
      plan.salesToUnlink.every((sale) => sale.sourceWorkOrderSaleId === null),
      true,
    );
  });
});
