import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyGeneratedPayments,
  applyMemberCodes,
  collectGeneratedSaleIdsNeedingPayments,
} from "../../src/modules/migrations/harbour-sale-payload.js";

const sale = (overrides: Record<string, unknown> = {}) => ({
  id: "sale-1",
  orderNumber: 62,
  userId: "user-1",
  sellerId: "seller-1",
  memberId: "member-1",
  memberName: "Cliente",
  member: { memberLegalName: "Cliente" },
  user: { id: "user-1", userName: "Operador" },
  seller: { id: "seller-1", userName: "Vendedor" },
  memberRef: { id: "member-1", userName: "Cliente" },
  payments: [] as { id: string }[],
  generatedSales: [] as { id: string }[],
  ...overrides,
});

describe("harbour-sale-payload", () => {
  it("grava code Harbour antes de memberId e no cliente", () => {
    const [result] = applyMemberCodes(
      [sale()],
      new Map([["member-1", 12]]),
    );
    const keys = Object.keys(result);
    const codeIndex = keys.indexOf("code");
    const memberIdIndex = keys.indexOf("memberId");

    assert.equal(result.code, 12);
    assert.equal((result.member as { code: number }).code, 12);
    assert.ok(codeIndex >= 0 && codeIndex === memberIdIndex - 1);
  });

  it("remove user, seller e memberRef do payload", () => {
    const [result] = applyMemberCodes(
      [sale()],
      new Map([["member-1", 12]]),
    );

    assert.equal("user" in result, false);
    assert.equal("seller" in result, false);
    assert.equal("memberRef" in result, false);
  });

  it("grava code do produto no item e remove productsEnterprises nested", () => {
    const [result] = applyMemberCodes(
      [
        sale({
          items: [
            {
              id: "item-1",
              quantity: "1.0000",
              productsEnterprisesId: "pe-1",
              productCode: 100,
              user: { id: "user-1", userName: "Operador" },
              seller: { id: "seller-1", userName: "Vendedor" },
              productsEnterprises: {
                id: "pe-1",
                code: 100,
                description: "Produto Empresa 1-100",
              },
            },
          ],
        }),
      ],
      new Map([["member-1", 12]]),
    );
    const item = (result.items as Record<string, unknown>[])[0]!;

    assert.equal(item.code, 100);
    assert.equal(item.productsEnterprisesId, "pe-1");
    assert.equal("productCode" in item, false);
    assert.equal("productsEnterprises" in item, false);
    assert.equal("user" in item, false);
    assert.equal("seller" in item, false);
  });

  it("usa null quando o membro nao tem code", () => {
    const [result] = applyMemberCodes([sale()], new Map());

    assert.equal(result.code, null);
    assert.equal((result.member as { code: number | null }).code, null);
  });

  it("coleta IDs das vendas geradas so quando payments esta vazio", () => {
    const ids = collectGeneratedSaleIdsNeedingPayments([
      sale({ generatedSales: [{ id: "gen-1" }, { id: "gen-2" }] }),
      sale({
        memberId: "member-2",
        payments: [{ id: "own-pay" }],
        generatedSales: [{ id: "gen-ignored" }],
      }),
    ]);

    assert.deepEqual(ids.sort(), ["gen-1", "gen-2"]);
  });

  it("puxa pagamentos da venda gerada quando a OS nao tem payments", () => {
    const generatedPay = { id: "pay-from-sale" };
    const [result] = applyGeneratedPayments(
      [sale({ generatedSales: [{ id: "gen-1" }] })],
      new Map([["gen-1", [generatedPay]]]),
    );

    assert.deepEqual(result.payments, [generatedPay]);
  });

  it("nao sobrescreve payments ja existentes na OS", () => {
    const ownPay = { id: "own-pay" };
    const [result] = applyGeneratedPayments(
      [
        sale({
          payments: [ownPay],
          generatedSales: [{ id: "gen-1" }],
        }),
      ],
      new Map([["gen-1", [{ id: "pay-from-sale" }]]]),
    );

    assert.deepEqual(result.payments, [ownPay]);
  });
});
