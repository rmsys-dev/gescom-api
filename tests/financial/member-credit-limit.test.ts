import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../../src/shared/errors/app-error.js";
import {
  buildMemberCreditCheck,
  dueDateInSaleMonth,
  monthEndDateOnly,
  monthStartDateOnly,
  rejectIfCreditExceeded,
} from "../../src/modules/financial/member-credit-check.js";

describe("credito do membro", () => {
  it("fecha o mes da venda, inclusive fevereiro bissexto", () => {
    assert.equal(monthStartDateOnly("2026-10-17"), "2026-10-01");
    assert.equal(monthEndDateOnly("2026-10-17"), "2026-10-31");
    assert.equal(monthEndDateOnly("2026-02-10"), "2026-02-28");
    assert.equal(monthEndDateOnly("2024-02-10"), "2024-02-29");
    assert.equal(monthEndDateOnly("2026-12-01"), "2026-12-31");
  });

  it("mensal olha so o que vence no mes da venda", () => {
    const saleDate = "2026-10-17";
    assert.equal(dueDateInSaleMonth("2026-09-30", saleDate), false);
    assert.equal(dueDateInSaleMonth("2026-10-01", saleDate), true);
    assert.equal(dueDateInSaleMonth("2026-10-31", saleDate), true);
    assert.equal(dueDateInSaleMonth("2026-11-01", saleDate), false);
  });

  it("mensal compara o debito do mes com o valor inteiro da venda", () => {
    const room = buildMemberCreditCheck({
      creditLimit: "500.00",
      creditType: "MENSAL",
      debtorBalanceCents: 40_000,
      saleTotal: "100.00",
    });
    assert.equal(room.applies, true);
    if (!room.applies) return;
    assert.equal(room.saleTotal, "100.00");
    assert.equal(room.exposure, "500.00");
    assert.equal(room.allowed, true);

    const over = buildMemberCreditCheck({
      creditLimit: "500.00",
      creditType: "MENSAL",
      debtorBalanceCents: 40_000,
      saleTotal: "100.01",
    });
    assert.equal(over.applies, true);
    if (!over.applies) return;
    assert.equal(over.allowed, false);
  });

  it("limite zerado ou ausente nao aplica a regra", () => {
    assert.deepEqual(
      buildMemberCreditCheck({
        creditLimit: "0.00",
        creditType: "GERAL",
        debtorBalanceCents: 10_000,
        saleTotal: "50.00",
      }),
      { applies: false },
    );
    assert.deepEqual(
      buildMemberCreditCheck({
        creditLimit: null,
        creditType: "MENSAL",
        debtorBalanceCents: 1,
        saleTotal: 1,
      }),
      { applies: false },
    );
  });

  it("sem tipo de credito trata o limite como geral", () => {
    const check = buildMemberCreditCheck({
      creditLimit: "100.00",
      creditType: null,
      debtorBalanceCents: 0,
      saleTotal: "10.00",
    });
    assert.equal(check.applies, true);
    if (!check.applies) return;
    assert.equal(check.creditType, "GERAL");
  });

  it("exposicao igual ao limite passa", () => {
    const check = buildMemberCreditCheck({
      creditLimit: "100.00",
      creditType: "MENSAL",
      debtorBalanceCents: 4_000,
      saleTotal: "60.00",
    });
    assert.equal(check.applies, true);
    if (!check.applies) return;
    assert.equal(check.creditType, "MENSAL");
    assert.equal(check.creditLimit, "100.00");
    assert.equal(check.debtorBalance, "40.00");
    assert.equal(check.saleTotal, "60.00");
    assert.equal(check.exposure, "100.00");
    assert.equal(check.allowed, true);
  });

  it("um centavo acima do limite bloqueia e devolve os valores da tela", () => {
    const check = buildMemberCreditCheck({
      creditLimit: "100.00",
      creditType: "GERAL",
      debtorBalanceCents: 4_000,
      saleTotal: "60.01",
    });
    assert.equal(check.applies, true);
    if (!check.applies) return;
    assert.equal(check.exposure, "100.01");
    assert.equal(check.allowed, false);

    assert.throws(
      () => rejectIfCreditExceeded(check),
      (error: unknown) => {
        assert.ok(error instanceof AppError);
        assert.equal(error.code, "CREDIT_LIMIT_EXCEEDED");
        assert.equal(error.statusCode, 422);
        assert.match(
          error.message,
          /Limite de crédito geral excedido\. Limite: R\$\s*100,00\. Débito atual: R\$\s*40,00\. Valor da venda: R\$\s*60,01\. Total: R\$\s*100,01\./,
        );
        assert.deepEqual(error.details, [
          { path: "tipoCredito", message: "Geral" },
          { path: "limite", message: "100.00" },
          { path: "debitoAtual", message: "40.00" },
          { path: "valorVenda", message: "60.01" },
          { path: "total", message: "100.01" },
        ]);
        return true;
      },
    );
  });
});
