import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyPromotionalUnitPrice,
  moneyEquals,
  pickActivePromotionalPrice,
} from "../../src/shared/products/resolve-sale-price-logic.js";

const d = (iso: string) => new Date(iso);

describe("pickActivePromotionalPrice", () => {
  const productPromos = [
    {
      id: "aaa-1111-1111-1111-111111111111",
      price: "90.00",
      startDate: d("2026-01-01T00:00:00.000Z"),
      endDate: d("2026-01-31T23:59:59.000Z"),
    },
    {
      id: "bbb-2222-2222-2222-222222222222",
      price: "80.00",
      startDate: d("2026-07-01T00:00:00.000Z"),
      endDate: d("2026-07-31T23:59:59.000Z"),
    },
    {
      id: "ccc-3333-3333-3333-333333333333",
      price: "70.00",
      startDate: d("2026-07-10T00:00:00.000Z"),
      endDate: d("2026-07-20T23:59:59.000Z"),
    },
  ];

  it("retorna null quando a promocao ainda nao iniciou", () => {
    const picked = pickActivePromotionalPrice(
      productPromos,
      d("2025-12-15T12:00:00.000Z"),
    );
    assert.equal(picked, null);
  });

  it("retorna null quando a promocao ja expirou", () => {
    const picked = pickActivePromotionalPrice(
      productPromos,
      d("2026-02-15T12:00:00.000Z"),
    );
    assert.equal(picked, null);
  });

  it("retorna a promocao vigente", () => {
    const picked = pickActivePromotionalPrice(
      productPromos,
      d("2026-01-15T12:00:00.000Z"),
    );
    assert.equal(picked?.id, "aaa-1111-1111-1111-111111111111");
    assert.equal(picked?.price, "90.00");
  });

  it("em sobreposicao escolhe startDate mais recente", () => {
    const picked = pickActivePromotionalPrice(
      productPromos,
      d("2026-07-15T12:00:00.000Z"),
    );
    assert.equal(picked?.id, "ccc-3333-3333-3333-333333333333");
    assert.equal(picked?.price, "70.00");
  });

  it("inclui o limite de startDate e endDate (UTC)", () => {
    const atStart = pickActivePromotionalPrice(
      productPromos,
      d("2026-01-01T00:00:00.000Z"),
    );
    const atEnd = pickActivePromotionalPrice(
      productPromos,
      d("2026-01-31T23:59:59.000Z"),
    );
    assert.equal(atStart?.id, "aaa-1111-1111-1111-111111111111");
    assert.equal(atEnd?.id, "aaa-1111-1111-1111-111111111111");
  });

  it("em empate de startDate desempata por id DESC", () => {
    const tied = [
      {
        id: "a0000000-0000-0000-0000-000000000001",
        price: "50.00",
        startDate: d("2026-07-01T00:00:00.000Z"),
        endDate: d("2026-07-31T23:59:59.000Z"),
      },
      {
        id: "z0000000-0000-0000-0000-000000000099",
        price: "45.00",
        startDate: d("2026-07-01T00:00:00.000Z"),
        endDate: d("2026-07-31T23:59:59.000Z"),
      },
    ];
    const picked = pickActivePromotionalPrice(
      tied,
      d("2026-07-15T12:00:00.000Z"),
    );
    assert.equal(picked?.id, "z0000000-0000-0000-0000-000000000099");
  });
});

describe("applyPromotionalUnitPrice (modo hibrido)", () => {
  it("sem promocao mantem valueUnit do cliente", () => {
    const result = applyPromotionalUnitPrice({
      valueUnit: 100,
      tablePrice: 100,
      promotionalPrice: null,
    });
    assert.deepEqual(result, { valueUnit: 100, appliedPromotional: false });
  });

  it("troca preco de tabela pelo promocional", () => {
    const result = applyPromotionalUnitPrice({
      valueUnit: 100,
      tablePrice: 100,
      promotionalPrice: 80,
    });
    assert.deepEqual(result, { valueUnit: 80, appliedPromotional: true });
  });

  it("mantem quando valueUnit ja e o promocional", () => {
    const result = applyPromotionalUnitPrice({
      valueUnit: 80,
      tablePrice: 100,
      promotionalPrice: 80,
    });
    assert.deepEqual(result, { valueUnit: 80, appliedPromotional: true });
  });

  it("mantem preco customizado diferente de tabela e promo", () => {
    const result = applyPromotionalUnitPrice({
      valueUnit: 95,
      tablePrice: 100,
      promotionalPrice: 80,
    });
    assert.deepEqual(result, { valueUnit: 95, appliedPromotional: false });
  });

  it("aceita tolerancia de arredondamento no preco de tabela", () => {
    assert.equal(moneyEquals(100, 100.01), true);
    const result = applyPromotionalUnitPrice({
      valueUnit: 100.01,
      tablePrice: 100,
      promotionalPrice: 80,
    });
    assert.deepEqual(result, { valueUnit: 80, appliedPromotional: true });
  });
});
