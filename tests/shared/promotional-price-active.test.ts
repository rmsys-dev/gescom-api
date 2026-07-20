import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  findBlockingPromotion,
  isPromotionEndDateBlocking,
} from "../../src/shared/products/promotional-price-active.js";

const d = (iso: string) => new Date(iso);

describe("isPromotionEndDateBlocking", () => {
  const now = d("2026-07-20T12:00:00.000Z");

  it("nao bloqueia quando endDate e anterior a hoje", () => {
    assert.equal(
      isPromotionEndDateBlocking(d("2026-07-19T23:59:59.000Z"), now),
      false,
    );
  });

  it("bloqueia quando endDate e igual a agora", () => {
    assert.equal(isPromotionEndDateBlocking(now, now), true);
  });

  it("bloqueia quando endDate e futura", () => {
    assert.equal(
      isPromotionEndDateBlocking(d("2026-07-21T00:00:00.000Z"), now),
      true,
    );
  });
});

describe("findBlockingPromotion", () => {
  const now = d("2026-07-20T12:00:00.000Z");

  it("retorna null quando nao ha promocoes", () => {
    assert.equal(findBlockingPromotion([], now), null);
  });

  it("retorna null quando todas as promocoes ja encerraram", () => {
    const rows = [
      { id: "a", endDate: d("2026-07-10T00:00:00.000Z") },
      { id: "b", endDate: d("2026-07-19T23:59:59.000Z") },
    ];
    assert.equal(findBlockingPromotion(rows, now), null);
  });

  it("bloqueia quando existe promocao com endDate hoje ou futura", () => {
    const rows = [
      { id: "expired", endDate: d("2026-07-01T00:00:00.000Z") },
      { id: "active", endDate: d("2026-07-31T23:59:59.000Z") },
    ];
    const blocking = findBlockingPromotion(rows, now);
    assert.equal(blocking?.id, "active");
  });

  it("no patch ignora o proprio registro ativo via excludeId", () => {
    const rows = [
      { id: "self", endDate: d("2026-07-31T23:59:59.000Z") },
    ];
    assert.equal(findBlockingPromotion(rows, now, "self"), null);
  });

  it("no patch ainda bloqueia outra promocao ativa do mesmo produto", () => {
    const rows = [
      { id: "self", endDate: d("2026-07-31T23:59:59.000Z") },
      { id: "other", endDate: d("2026-08-15T00:00:00.000Z") },
    ];
    const blocking = findBlockingPromotion(rows, now, "self");
    assert.equal(blocking?.id, "other");
  });
});
