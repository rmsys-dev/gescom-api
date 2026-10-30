import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyProductIcms,
  fillItemPisCofins,
  type ResolvedStateOperation,
} from "../../src/modules/nfe/operations/product-icms.js";
import { createCstSchema } from "../../src/modules/maintainer/nfe/cst/schema.js";
import {
  calculateItemTax,
  sumInvoiceTotals,
} from "../../src/modules/nfe/tax/calculate.js";
import { buildNfeXml } from "../../src/modules/nfe/sefaz/nfe-xml.js";

const saleItem = {
  productsEnterprisesId: "00000000-0000-4000-8000-000000000001",
  nItem: 1,
  xProd: "Produto",
  vProd: 100,
};

const operation = (
  cst: string,
  taxationType: ResolvedStateOperation["taxationType"],
): ResolvedStateOperation => ({
  id: "00000000-0000-4000-8000-000000000010",
  uf: "GO",
  cfop: "5102",
  cfopDescription: "Venda de mercadoria",
  origin: "0",
  cst,
  taxationType,
});

describe("calculo de tributos da NF-e", () => {
  it("calcula ICMS, PIS e COFINS de uma saida e os totais", () => {
    const amounts = { vProd: 100, vFrete: 0, vSeg: 0, vDesc: 0, vOutro: 0 };
    const tax = calculateItemTax(amounts, {
      pIcms: 18,
      pPis: 1.65,
      pCofins: 7.6,
    });

    assert.equal(tax.vBc, 100);
    assert.equal(tax.vIcms, 18);
    assert.equal(tax.vPis, 1.65);
    assert.equal(tax.vCofins, 7.6);

    const totals = sumInvoiceTotals([{ amounts, tax }]);
    assert.equal(totals.vIcms, 18);
    assert.equal(totals.vPis, 1.65);
    assert.equal(totals.vCofins, 7.6);
    assert.equal(totals.vNf, 100);
    assert.equal(totals.vNfTot, 100);
  });

  it("aplica a aliquota do produto quando o CST da operacao e tributado", () => {
    const item = applyProductIcms(saleItem, [operation("00", "1")], {
      icms: "01",
      icmsRate: "18",
      simplesIcmsRate: "4",
      productType: "00",
      crt: "3",
    });

    assert.equal(item.cfop, "5102");
    assert.equal(item.tax?.icmsOrig, "0");
    assert.equal(item.tax?.icmsCst, "00");
    assert.equal(item.tax?.pIcms, 18);

    const tax = calculateItemTax({ vProd: item.vProd }, { pIcms: item.tax?.pIcms });
    assert.equal(tax.vBc, 100);
    assert.equal(tax.vIcms, 18);
  });

  it("usa a aliquota interestadual do estado quando a UF e diferente da empresa", () => {
    const item = applyProductIcms(
      saleItem,
      [{ ...operation("00", "1"), uf: "SP", cfop: "6102", interstateAliquot: "12" }],
      {
        icms: "01",
        icmsRate: "19",
        simplesIcmsRate: "4",
        productType: "00",
        crt: "3",
        interstate: true,
      },
    );

    assert.equal(item.cfop, "6102");
    assert.equal(item.tax?.pIcms, 12);
    const tax = calculateItemTax({ vProd: item.vProd }, { pIcms: item.tax?.pIcms });
    assert.equal(tax.vIcms, 12);
  });

  it("nao destaca ICMS no Simples Nacional", () => {
    const item = applyProductIcms(
      { ...saleItem, tax: { pIcms: 18 } },
      [operation("102", "1")],
      {
        icms: "01",
        icmsRate: "18",
        simplesIcmsRate: "4",
        productType: "00",
        crt: "1",
      },
    );

    assert.equal(item.tax?.icmsCsosn, "102");
    assert.equal(item.tax?.pIcms, undefined);
    const tax = calculateItemTax({ vProd: item.vProd }, { pIcms: item.tax?.pIcms });
    assert.equal(tax.vIcms, 0);
  });

  it("usa CSOSN e nao destaca ICMS no CRT 2", () => {
    const item = applyProductIcms(
      { ...saleItem, tax: { pIcms: 18 } },
      [operation("101", "1")],
      {
        icms: "01",
        icmsRate: "18",
        simplesIcmsRate: "4",
        productType: "00",
        crt: "2",
      },
    );

    assert.equal(item.tax?.icmsCsosn, "101");
    assert.equal(item.tax?.icmsCst, undefined);
    assert.equal(item.tax?.pIcms, undefined);
    const tax = calculateItemTax({ vProd: item.vProd }, { pIcms: item.tax?.pIcms });
    assert.equal(tax.vIcms, 0);
  });

  it("recusa produto cuja tributacao nao tem operacao na UF", () => {
    assert.throws(
      () =>
        applyProductIcms(saleItem, [operation("00", "1")], {
          icms: "FF",
          icmsRate: "18",
          simplesIcmsRate: "4",
          productType: "00",
          crt: "3",
        }),
      (err: unknown) =>
        err instanceof Error &&
        (err as { code?: string }).code === "NFE_OPERATION_STATE_CST",
    );
  });

  it("mantem o ICMS zerado quando a operacao e isenta", () => {
    const item = applyProductIcms(saleItem, [operation("40", "4")], {
      icms: "II",
      icmsRate: "18",
      simplesIcmsRate: "4",
      productType: "00",
      crt: "3",
    });

    assert.equal(item.tax?.icmsCst, "40");
    assert.equal(item.tax?.pIcms, undefined);
    const tax = calculateItemTax({ vProd: item.vProd }, { pIcms: item.tax?.pIcms });
    assert.equal(tax.vIcms, 0);
  });

  it("acha o CFOP pela tributacao do produto na UF", () => {
    const operations = [
      { ...operation("00", "1"), icms: "01", cfop: "5102" },
      { ...operation("60", "2"), icms: "FF", cfop: "5405" },
      { ...operation("40", "4"), icms: "II", cfop: "5910" },
    ];
    const situation = { icmsRate: "19", simplesIcmsRate: "0", productType: "00", crt: "3" };
    const cfopOf = (icms: string) =>
      applyProductIcms(saleItem, operations, { ...situation, icms }).cfop;
    assert.equal(cfopOf("01"), "5102");
    assert.equal(cfopOf("FF"), "5405");
    assert.equal(cfopOf("II"), "5910");
  });

  it("escolhe a operacao da UF pela tributacao do produto (01, FF, II, NN)", () => {
    const operations = [
      operation("00", "1"),
      { ...operation("60", "2"), cfop: "5405" },
      operation("40", "4"),
      operation("41", "4"),
    ];
    const situation = { icmsRate: "19", simplesIcmsRate: "0", productType: "00", crt: "3" };
    const cstOf = (icms: string) =>
      applyProductIcms(saleItem, operations, { ...situation, icms }).tax?.icmsCst;
    assert.equal(cstOf("01"), "00");
    assert.equal(cstOf("FF"), "60");
    assert.equal(cstOf("II"), "40");
    assert.equal(cstOf("nn"), "41");
  });

  it("recusa codigo de tributacao desconhecido", () => {
    assert.throws(
      () =>
        applyProductIcms(saleItem, [operation("00", "1")], {
          icms: "XX",
          icmsRate: "18",
          simplesIcmsRate: "0",
          productType: "00",
          crt: "3",
        }),
      (err: unknown) =>
        err instanceof Error &&
        (err as { code?: string }).code === "NFE_OPERATION_PRODUCT_ICMS",
    );
  });
});

describe("PIS/COFINS do produto", () => {
  const product = {
    pisCst: "01",
    pisRate: "1.65",
    cofinsCst: "01",
    cofinsRate: "7.6",
  };

  it("preenche CST e aliquota a partir do cadastro do produto", () => {
    const item = fillItemPisCofins(saleItem, product);

    assert.equal(item.tax?.pisCst, "01");
    assert.equal(item.tax?.pPis, 1.65);
    assert.equal(item.tax?.cofinsCst, "01");
    assert.equal(item.tax?.pCofins, 7.6);

    const tax = calculateItemTax(
      { vProd: item.vProd },
      { pPis: item.tax?.pPis, pCofins: item.tax?.pCofins },
    );
    assert.equal(tax.pisVBc, 100);
    assert.equal(tax.vPis, 1.65);
    assert.equal(tax.cofinsVBc, 100);
    assert.equal(tax.vCofins, 7.6);
  });

  it("mantem o que veio no JSON do item", () => {
    const item = fillItemPisCofins(
      { ...saleItem, tax: { pisCst: "02", pPis: 2, cofinsCst: "02", pCofins: 9 } },
      product,
    );

    assert.equal(item.tax?.pisCst, "02");
    assert.equal(item.tax?.pPis, 2);
    assert.equal(item.tax?.cofinsCst, "02");
    assert.equal(item.tax?.pCofins, 9);
  });

  it("nao aplica aliquota em CST sem tributacao", () => {
    const item = fillItemPisCofins(saleItem, {
      pisCst: "7",
      pisRate: "1.65",
      cofinsCst: "07",
      cofinsRate: "7.6",
    });

    assert.equal(item.tax?.pisCst, "07");
    assert.equal(item.tax?.pPis, undefined);
    assert.equal(item.tax?.pCofins, undefined);
  });

  it("nao reduz a base do PIS/COFINS pela reducao do ICMS", () => {
    const tax = calculateItemTax(
      { vProd: 100 },
      { pIcms: 18, pRedBc: 50, pPis: 1.65, pCofins: 7.6 },
    );

    assert.equal(tax.vBc, 50);
    assert.equal(tax.pisVBc, 100);
    assert.equal(tax.vPis, 1.65);
    assert.equal(tax.vCofins, 7.6);
  });
});

describe("cadastro de CST", () => {
  const base = { origin: "0", description: "Teste", taxationType: "1" };

  it("aceita 2 digitos no CRT 3 e recusa 3", () => {
    assert.equal(
      createCstSchema.safeParse({ ...base, regimeTributario: "3", cst: "00" }).success,
      true,
    );
    assert.equal(
      createCstSchema.safeParse({ ...base, regimeTributario: "3", cst: "102" }).success,
      false,
    );
  });

  it("aceita 3 digitos fora do CRT 3 e recusa 2", () => {
    for (const regimeTributario of ["1", "2", "4"]) {
      assert.equal(
        createCstSchema.safeParse({ ...base, regimeTributario, cst: "102" }).success,
        true,
      );
      assert.equal(
        createCstSchema.safeParse({ ...base, regimeTributario, cst: "00" }).success,
        false,
      );
    }
  });

  it("exige a origem", () => {
    assert.equal(
      createCstSchema.safeParse({
        description: "Teste",
        regimeTributario: "3",
        cst: "00",
      }).success,
      false,
    );
  });
});

describe("xml da NF-e", () => {
  it("monta as tags obrigatorias de uma saida modelo 55", () => {
    const xml = buildNfeXml({
      chave: "5".repeat(44),
      cUf: "52",
      cNf: "12345678",
      natOp: "VENDA",
      mod: "55",
      serie: "1",
      nNf: 10,
      dhEmi: "2026-09-24T10:00:00-03:00",
      tpNf: "1",
      idDest: "1",
      cMunFg: 5208707,
      tpImp: "1",
      tpEmis: 1,
      cDv: "5",
      tpAmb: 2,
      finNfe: "1",
      indFinal: "1",
      indPres: "1",
      procEmi: "0",
      verProc: "gescom",
      emit: {
        cnpj: "00000000000191",
        xNome: "Empresa Teste",
        ie: "123456789",
        crt: "3",
        xlgr: "Rua A",
        nro: "10",
        xbairro: "Centro",
        cmun: "5208707",
        xmun: "Goiania",
        uf: "GO",
      },
      dest: {
        cnpj: "00000000000272",
        xNome: "Cliente",
        indIeDest: "9",
        xlgr: "Rua B",
        nro: "20",
        xbairro: "Setor",
        cmun: "5208707",
        xmun: "Goiania",
        uf: "GO",
      },
      items: [
        {
          nItem: 1,
          cProd: "1",
          xProd: "Produto",
          ncm: "23025000",
          cfop: "5102",
          uCom: "UN",
          qCom: 1,
          vUnCom: 100,
          vProd: 100,
          indTot: "1",
          icmsOrig: "0",
          icmsCst: "00",
          icmsVBc: 100,
          icmsPIcms: 18,
          icmsVIcms: 18,
          pisCst: "01",
          pisVBc: 100,
          pisPPis: 1.65,
          pisVPis: 1.65,
          cofinsCst: "01",
          cofinsVBc: 100,
          cofinsPCofins: 7.6,
          cofinsVCofins: 7.6,
          vTotTrib: 27.25,
        },
      ],
      payments: [{ indPag: "0", tPag: "01", vPag: 100 }],
      vBc: 100,
      vIcms: 18,
      vProd: 100,
      vPis: 1.65,
      vCofins: 7.6,
      vNf: 100,
      vTotTrib: 27.25,
      transport: { modFrete: "9" },
    });

    assert.match(xml, /<infNFe versao="4.00"/);
    assert.match(xml, /<mod>55<\/mod>/);
    assert.match(xml, /<CFOP>5102<\/CFOP>/);
    assert.match(xml, /<vICMS>18.00<\/vICMS>/);
    assert.match(xml, /<PISAliq><CST>01<\/CST>.*<vPIS>1.65<\/vPIS><\/PISAliq>/);
    assert.match(xml, /<vCOFINS>7.60<\/vCOFINS>/);
    assert.match(xml, /<modFrete>9<\/modFrete>/);
    assert.match(xml, /<tPag>01<\/tPag>/);
    assert.match(xml, /<imposto><vTotTrib>27.25<\/vTotTrib><ICMS>/);
    assert.match(xml, /<vNF>100.00<\/vNF><vTotTrib>27.25<\/vTotTrib>/);
  });

  it("usa o grupo de PIS/COFINS conforme o CST", () => {
    const xml = buildNfeXml({
      chave: "8".repeat(44),
      cUf: "52",
      cNf: "12345678",
      mod: "65",
      serie: "1",
      nNf: 3,
      dhEmi: "2026-09-24T10:00:00-03:00",
      cMunFg: 5208707,
      tpEmis: 1,
      tpAmb: 2,
      emit: { cnpj: "00000000000191", xNome: "Loja", crt: "1" },
      items: [
        { nItem: 1, xProd: "Isento", vProd: 10, pisCst: "07", cofinsCst: "07" },
        { nItem: 2, xProd: "Outras", vProd: 10, pisCst: "99", cofinsCst: "49" },
      ],
      payments: [{ tPag: "01", vPag: 20 }],
    });

    assert.match(xml, /<PIS><PISNT><CST>07<\/CST><\/PISNT><\/PIS>/);
    assert.match(xml, /<COFINS><COFINSNT><CST>07<\/CST><\/COFINSNT><\/COFINS>/);
    assert.match(
      xml,
      /<PISOutr><CST>99<\/CST><vBC>0.00<\/vBC><pPIS>0.0000<\/pPIS><vPIS>0.00<\/vPIS><\/PISOutr>/,
    );
    assert.match(xml, /<COFINSOutr><CST>49<\/CST>/);
  });

  it("grava o frete 9 na NFC-e, sem transportadora", () => {
    const xml = buildNfeXml({
      chave: "6".repeat(44),
      cUf: "52",
      cNf: "12345678",
      mod: "65",
      serie: "1",
      nNf: 1,
      dhEmi: "2026-09-24T10:00:00-03:00",
      cMunFg: 5208707,
      tpEmis: 1,
      tpAmb: 2,
      emit: { cnpj: "00000000000191", xNome: "Loja", crt: "1" },
      items: [{ nItem: 1, xProd: "Item", vProd: 10 }],
      payments: [{ tPag: "01", vPag: 10 }],
      transport: { modFrete: "9" },
    });

    assert.match(xml, /<mod>65<\/mod>/);
    assert.match(xml, /<transp><modFrete>9<\/modFrete><\/transp>/);
    assert.equal(xml.includes("<transporta>"), false);
  });

  it("mostra o valor original do item com desconto e acrescimo", () => {
    const xml = buildNfeXml({
      chave: "7".repeat(44),
      cUf: "52",
      cNf: "12345678",
      mod: "65",
      serie: "1",
      nNf: 2,
      dhEmi: "2026-09-24T10:00:00-03:00",
      cMunFg: 5208707,
      tpEmis: 1,
      tpAmb: 2,
      emit: { cnpj: "00000000000191", xNome: "Loja", crt: "1" },
      items: [
        { nItem: 1, xProd: "Com desconto", qCom: 2, vUnCom: 50, vProd: 100, vDesc: 10 },
        { nItem: 2, xProd: "Com acrescimo", qCom: 1, vUnCom: 20, vProd: 20, vOutro: 2 },
      ],
      payments: [{ tPag: "01", vPag: 112 }],
      vProd: 120,
      vDesc: 10,
      vOutro: 2,
      vNf: 112,
    });

    const first = xml.slice(xml.indexOf('<det nItem="1">'), xml.indexOf('<det nItem="2">'));
    assert.match(first, /<vProd>100.00<\/vProd>.*<vDesc>10.00<\/vDesc><indTot>/);
    assert.equal(first.includes("<vOutro>"), false);
    assert.match(xml, /<det nItem="2">.*<vOutro>2.00<\/vOutro><indTot>/);
    assert.match(xml, /<ICMSTot>.*<vDesc>10.00<\/vDesc>.*<vOutro>2.00<\/vOutro><vNF>112.00<\/vNF>/);
  });
});
