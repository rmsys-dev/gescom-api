import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildNfeXml } from "../../src/modules/nfe/sefaz/nfe-xml.js";
import { resolveNfePayment } from "../../src/modules/nfe/sefaz/payment-detpag.js";

const note = (payments: Parameters<typeof buildNfeXml>[0]["payments"]) =>
  buildNfeXml({
    chave: "1".repeat(44),
    cUf: "52",
    cNf: "12345678",
    mod: "55",
    serie: "1",
    nNf: 1,
    dhEmi: "2026-10-05T10:00:00-03:00",
    cMunFg: 5208707,
    tpEmis: 1,
    tpAmb: 2,
    emit: { cnpj: "00000000000191", xNome: "Loja", crt: "1" },
    items: [{ nItem: 1, xProd: "Item", vProd: 10 }],
    payments,
  });

const detPag = (xml: string) => {
  const start = xml.indexOf("<detPag>");
  const end = xml.indexOf("</detPag>");
  return xml.slice(start, end + "</detPag>".length);
};

describe("pagamento da NF-e na regra do Harbour", () => {
  it("resolve tPag pelo meio, e xPag só no código 99", () => {
    const card = resolveNfePayment(
      { tPag: "01", xPag: "gravado", cardCnpj: "11.222.333/0001-81", cardCAut: "ABC" },
      { paymentCode: "3", integration: "1", flagCode: "1", flagDescription: "Visa" },
    );
    assert.deepEqual(card, {
      tPag: "03",
      cardTpIntegra: "1",
      cardTBand: "01",
      cardCnpj: "11222333000181",
      cardCAut: "ABC",
    });

    const other = resolveNfePayment(
      { cardCAut: "  " },
      { paymentCode: "99", flagDescription: "Bandeira local" },
    );
    assert.equal(other.tPag, "99");
    assert.equal(other.xPag, "Bandeira local");

    const fallback = resolveNfePayment(
      { tPag: "15", xPag: "Boleto especial" },
      { paymentDescription: "dinheiro" },
    );
    assert.equal(fallback.tPag, "15");
    assert.equal(fallback.xPag, undefined);

    const guessed = resolveNfePayment({}, { paymentDescription: "pix" });
    assert.equal(guessed.tPag, "17");
    assert.equal(guessed.xPag, undefined);

    const outros = resolveNfePayment({}, { paymentDescription: "vale qualquer" });
    assert.equal(outros.tPag, "99");
    assert.equal(outros.xPag, "OUTROS");
  });

  it("CNPJ do membro da configuração vence o gravado na parcela", () => {
    const fromConfig = resolveNfePayment(
      { cardCnpj: "11222333000181" },
      { paymentCode: "3", integration: "1", flagCode: "1", cnpj: "60.701.190/0001-04" },
    );
    assert.equal(fromConfig.cardCnpj, "60701190000104");

    const invalidConfig = resolveNfePayment(
      { cardCnpj: "11222333000181" },
      { paymentCode: "3", cnpj: "123" },
    );
    assert.equal(invalidConfig.cardCnpj, "11222333000181");
  });

  it("emite xPag só quando tPag é 99", () => {
    const money = detPag(note([{ tPag: "01", xPag: "Dinheiro", vPag: 10, indPag: "0" }]));
    assert.match(money, /<tPag>01<\/tPag>/);
    assert.equal(money.includes("<xPag>"), false);
    assert.match(money, /<vPag>10.00<\/vPag>/);
    assert.equal(money.includes("<card>"), false);

    const other = detPag(note([{ tPag: "99", vPag: 10 }]));
    assert.match(other, /<xPag>OUTROS<\/xPag>/);

    const named = detPag(note([{ tPag: "99", xPag: "Bandeira local", vPag: 10 }]));
    assert.match(named, /<xPag>Bandeira local<\/xPag>/);
  });

  it("abre card completo quando a bandeira é maior que zero", () => {
    const xml = detPag(
      note([
        {
          tPag: "03",
          vPag: 10,
          cardTpIntegra: "1",
          cardCnpj: "11222333000181",
          cardTBand: "01",
          cardCAut: "ABC123",
        },
      ]),
    );
    assert.match(
      xml,
      /<card><tpIntegra>1<\/tpIntegra><CNPJ>11222333000181<\/CNPJ><tBand>01<\/tBand><cAut>ABC123<\/cAut><\/card>/,
    );
  });

  it("sem bandeira, integração 1 leva CNPJ e autorização, e 2 só o tpIntegra", () => {
    const integrated = detPag(
      note([
        {
          tPag: "17",
          vPag: 10,
          cardTpIntegra: "1",
          cardCnpj: "11222333000181",
          cardTBand: "00",
          cardCAut: "PIX1",
        },
      ]),
    );
    assert.match(
      integrated,
      /<card><tpIntegra>1<\/tpIntegra><CNPJ>11222333000181<\/CNPJ><cAut>PIX1<\/cAut><\/card>/,
    );
    assert.equal(integrated.includes("<tBand>"), false);

    const pos = detPag(
      note([
        {
          tPag: "04",
          vPag: 10,
          cardTpIntegra: "2",
          cardCnpj: "11222333000181",
          cardCAut: "POS1",
        },
      ]),
    );
    assert.match(pos, /<card><tpIntegra>2<\/tpIntegra><\/card>/);
    assert.equal(pos.includes("<CNPJ>"), false);
    assert.equal(pos.includes("<cAut>"), false);
  });

  it("monta cobr com fatura e duplicatas antes de pag, só na NF-e", () => {
    const base = {
      chave: "1".repeat(44),
      cUf: "52",
      cNf: "12345678",
      serie: "1",
      nNf: 7,
      dhEmi: "2026-10-05T10:00:00-03:00",
      cMunFg: 5208707,
      tpEmis: 1,
      tpAmb: 2,
      emit: { cnpj: "00000000000191", xNome: "Loja", crt: "1" },
      items: [{ nItem: 1, xProd: "Item", vProd: 100 }],
      payments: [{ tPag: "15", vPag: 100, indPag: "1" }],
      invoice: {
        nFat: "7",
        vOrig: 100,
        vDesc: 0,
        vLiq: 100,
        duplicates: [
          { nDup: "001", dVenc: "2026-11-04", vDup: 50 },
          { nDup: "002", dVenc: "2026-12-04", vDup: 50 },
        ],
      },
    };
    const xml = buildNfeXml({ ...base, mod: "55" });
    assert.match(
      xml,
      /<cobr><fat><nFat>7<\/nFat><vOrig>100.00<\/vOrig><vDesc>0.00<\/vDesc><vLiq>100.00<\/vLiq><\/fat><dup><nDup>001<\/nDup><dVenc>2026-11-04<\/dVenc><vDup>50.00<\/vDup><\/dup><dup><nDup>002<\/nDup><dVenc>2026-12-04<\/dVenc><vDup>50.00<\/vDup><\/dup><\/cobr><pag>/,
    );

    const nfce = buildNfeXml({ ...base, mod: "65" });
    assert.equal(nfce.includes("<cobr>"), false);

    const noInvoice = buildNfeXml({ ...base, mod: "55", invoice: null });
    assert.equal(noInvoice.includes("<cobr>"), false);
  });

  it("não abre card quando integração é zero e não há bandeira", () => {
    const xml = detPag(
      note([
        {
          tPag: "01",
          vPag: 10,
          cardTpIntegra: "0",
          cardCnpj: "11222333000181",
          cardCAut: "X",
        },
      ]),
    );
    assert.equal(xml.includes("<card>"), false);
  });
});
