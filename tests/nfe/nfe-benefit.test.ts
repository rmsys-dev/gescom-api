import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  fillItemDifal,
  requiresBenefit,
  type ResolvedStateOperation,
} from "../../src/modules/nfe/operations/product-icms.js";
import { buildNfeXml, type NfeXmlDocument } from "../../src/modules/nfe/sefaz/nfe-xml.js";
import {
  calculateItemTax,
  sumInvoiceTotals,
} from "../../src/modules/nfe/tax/calculate.js";

const amounts = { vProd: 100 };

const xmlDocument = (item: NfeXmlDocument["items"][number]): NfeXmlDocument => ({
  chave: "5".repeat(44),
  cUf: "52",
  cNf: "12345678",
  mod: "55",
  serie: "1",
  nNf: 1,
  dhEmi: "2026-09-29T10:00:00-03:00",
  cMunFg: 5208707,
  tpEmis: 1,
  tpAmb: 2,
  emit: { cnpj: "00000000000191", xNome: "Empresa", crt: "3", uf: "GO" },
  dest: { cnpj: "00000000000272", xNome: "Cliente", uf: "AM", isuf: "123456789" },
  items: [item],
  payments: [{ tPag: "01", vPag: 100 }],
  vBc: 0,
  vIcms: 0,
  vIcmsDeson: 18,
  vProd: 100,
  vNf: 82,
});

describe("condicao do codigo de beneficio fiscal", () => {
  it("exige beneficio para CRT 3, finalidade normal e CST com reducao", () => {
    assert.equal(
      requiresBenefit("3", "1", { featuresReduction: true, taxationType: "1" }),
      true,
    );
  });

  it("exige beneficio para CRT 3, finalidade normal e CST isento", () => {
    assert.equal(
      requiresBenefit("3", "1", { featuresReduction: false, taxationType: "4" }),
      true,
    );
  });

  it("nao exige beneficio para CST tributado sem reducao", () => {
    assert.equal(
      requiresBenefit("3", "1", { featuresReduction: false, taxationType: "1" }),
      false,
    );
  });

  it("nao exige beneficio fora do regime normal (CRT diferente de 3)", () => {
    for (const crt of ["1", "2", "4"]) {
      assert.equal(
        requiresBenefit(crt, "1", { featuresReduction: true, taxationType: "4" }),
        false,
      );
    }
  });

  it("nao exige beneficio quando a finalidade nao e normal", () => {
    for (const finNfe of ["2", "3", "4", undefined]) {
      assert.equal(
        requiresBenefit("3", finNfe, { featuresReduction: true, taxationType: "4" }),
        false,
      );
    }
  });
});

describe("calculo com beneficio fiscal", () => {
  it("reduz so a base do ICMS e desonera a diferenca no CST 20", () => {
    const tax = calculateItemTax(amounts, {
      icmsCst: "20",
      pIcms: 18,
      pRedBc: 40,
      pIpi: 10,
      pPis: 1.65,
      pCofins: 7.6,
      pCbs: 0.9,
    });
    assert.equal(tax.vBc, 60);
    assert.equal(tax.vIcms, 10.8);
    assert.equal(tax.vIcmsDeson, 7.2);
    assert.equal(tax.ipiVBc, 100);
    assert.equal(tax.pisVBc, 100);
    assert.equal(tax.cofinsVBc, 100);
    assert.equal(tax.vBcIbsCbs, 100);
  });

  it("zera base e ICMS no isento e desonera o ICMS integral", () => {
    const tax = calculateItemTax(amounts, { icmsCst: "40", pIcms: 18 });
    assert.equal(tax.vBc, 0);
    assert.equal(tax.vIcms, 0);
    assert.equal(tax.vIcmsDeson, 18);
    const totals = sumInvoiceTotals([{ amounts, tax }]);
    assert.equal(totals.vBc, 0);
    assert.equal(totals.vIcmsDeson, 18);
    assert.equal(totals.vNf, 100);
  });

  it("deduz a desoneracao do total da nota quando indDeduzDeson = 1 (SUFRAMA)", () => {
    const tax = calculateItemTax(amounts, {
      icmsCst: "40",
      pIcms: 18,
      indDeduzDeson: "1",
    });
    const totals = sumInvoiceTotals([{ amounts, tax }]);
    assert.equal(totals.vIcmsDeson, 18);
    assert.equal(totals.vNf, 82);
  });

  it("nao desonera CST 00", () => {
    const tax = calculateItemTax(amounts, { icmsCst: "00", pIcms: 18 });
    assert.equal(tax.vIcms, 18);
    assert.equal(tax.vIcmsDeson, 0);
  });
});

describe("xml do ICMS com beneficio fiscal", () => {
  const baseItem = {
    nItem: 1,
    xProd: "Produto",
    cBenef: "GO123456",
    cfop: "6109",
    vProd: 100,
    icmsOrig: "0",
  };

  it("gera ICMS20 com pRedBC e desoneracao", () => {
    const xml = buildNfeXml(
      xmlDocument({
        ...baseItem,
        icmsCst: "20",
        icmsPRedBc: 40,
        icmsVBc: 60,
        icmsPIcms: 18,
        icmsVIcms: 10.8,
        icmsVIcmsDeson: 7.2,
        icmsMotDesIcms: "9",
        icmsIndDeduzDeson: "0",
      }),
    );
    assert.match(
      xml,
      /<ICMS20><orig>0<\/orig><CST>20<\/CST><modBC>3<\/modBC><pRedBC>40\.0000<\/pRedBC><vBC>60\.00<\/vBC><pICMS>18\.0000<\/pICMS><vICMS>10\.80<\/vICMS><vICMSDeson>7\.20<\/vICMSDeson><motDesICMS>9<\/motDesICMS><indDeduzDeson>0<\/indDeduzDeson><\/ICMS20>/,
    );
    assert.match(xml, /<cBenef>GO123456<\/cBenef>/);
  });

  it("gera ICMS40 sem base, com desoneracao SUFRAMA e ISUF do destinatario", () => {
    const xml = buildNfeXml(
      xmlDocument({
        ...baseItem,
        icmsCst: "40",
        icmsVBc: 0,
        icmsPIcms: 18,
        icmsVIcmsDeson: 18,
        icmsMotDesIcms: "7",
        icmsIndDeduzDeson: "1",
      }),
    );
    assert.match(
      xml,
      /<ICMS40><orig>0<\/orig><CST>40<\/CST><vICMSDeson>18\.00<\/vICMSDeson><motDesICMS>7<\/motDesICMS><indDeduzDeson>1<\/indDeduzDeson><\/ICMS40>/,
    );
    assert.match(xml, /<ISUF>123456789<\/ISUF>/);
    assert.match(xml, /<vICMS>0\.00<\/vICMS><vICMSDeson>18\.00<\/vICMSDeson>/);
  });

  it("omite a desoneracao no ICMS40 quando nao ha valor", () => {
    const xml = buildNfeXml(xmlDocument({ ...baseItem, icmsCst: "41" }));
    assert.match(xml, /<ICMS40><orig>0<\/orig><CST>41<\/CST><\/ICMS40>/);
  });
});

describe("xml dos demais grupos de ICMS, IPI e totais", () => {
  const baseItem = { nItem: 1, xProd: "Produto", cfop: "5405", vProd: 100, icmsOrig: "0" };
  const st = {
    icmsPMvaSt: 40,
    icmsVBcSt: 140,
    icmsPIcmsSt: 18,
    icmsVIcmsSt: 7.2,
  };
  const own = { icmsVBc: 100, icmsPIcms: 18, icmsVIcms: 18 };
  const icmsOf = (xml: string) => xml.slice(xml.indexOf("<ICMS>"), xml.indexOf("</ICMS>"));

  it("gera ICMS10 com ICMS proprio, FCP e ST", () => {
    const xml = buildNfeXml(
      xmlDocument({ ...baseItem, icmsCst: "10", ...own, icmsPFcp: 2, icmsVFcp: 2, ...st }),
    );
    assert.equal(
      icmsOf(xml),
      "<ICMS><ICMS10><orig>0</orig><CST>10</CST><modBC>3</modBC><vBC>100.00</vBC><pICMS>18.0000</pICMS><vICMS>18.00</vICMS>" +
        "<vBCFCP>100.00</vBCFCP><pFCP>2.0000</pFCP><vFCP>2.00</vFCP>" +
        "<modBCST>4</modBCST><pMVAST>40.0000</pMVAST><vBCST>140.00</vBCST><pICMSST>18.0000</pICMSST><vICMSST>7.20</vICMSST></ICMS10>",
    );
  });

  it("gera ICMS30 so com ST", () => {
    const xml = buildNfeXml(xmlDocument({ ...baseItem, icmsCst: "30", ...st }));
    assert.match(
      icmsOf(xml),
      /<ICMS30><orig>0<\/orig><CST>30<\/CST><modBCST>4<\/modBCST><pMVAST>40\.0000<\/pMVAST><vBCST>140\.00<\/vBCST><pICMSST>18\.0000<\/pICMSST><vICMSST>7\.20<\/vICMSST><\/ICMS30>/,
    );
  });

  it("gera ICMS60 apenas com origem e CST", () => {
    const xml = buildNfeXml(xmlDocument({ ...baseItem, icmsCst: "60" }));
    assert.equal(icmsOf(xml), "<ICMS><ICMS60><orig>0</orig><CST>60</CST></ICMS60>");
  });

  it("gera ICMS70 com reducao, ST e desoneracao", () => {
    const xml = buildNfeXml(
      xmlDocument({
        ...baseItem,
        icmsCst: "70",
        icmsPRedBc: 40,
        icmsVBc: 60,
        icmsPIcms: 18,
        icmsVIcms: 10.8,
        ...st,
        icmsVIcmsDeson: 7.2,
        icmsMotDesIcms: "9",
      }),
    );
    assert.match(
      icmsOf(xml),
      /<ICMS70><orig>0<\/orig><CST>70<\/CST><modBC>3<\/modBC><pRedBC>40\.0000<\/pRedBC><vBC>60\.00<\/vBC>.*<vICMS>10\.80<\/vICMS><modBCST>4<\/modBCST>.*<vICMSST>7\.20<\/vICMSST><vICMSDeson>7\.20<\/vICMSDeson><motDesICMS>9<\/motDesICMS><indDeduzDeson>0<\/indDeduzDeson><\/ICMS70>/,
    );
  });

  it("gera ICMS90 e ICMS51 sem campos quando nao ha ICMS", () => {
    assert.equal(
      icmsOf(buildNfeXml(xmlDocument({ ...baseItem, icmsCst: "90" }))),
      "<ICMS><ICMS90><orig>0</orig><CST>90</CST></ICMS90>",
    );
    assert.equal(
      icmsOf(buildNfeXml(xmlDocument({ ...baseItem, icmsCst: "51" }))),
      "<ICMS><ICMS51><orig>0</orig><CST>51</CST></ICMS51>",
    );
    assert.match(
      icmsOf(buildNfeXml(xmlDocument({ ...baseItem, icmsCst: "90", ...own }))),
      /<ICMS90><orig>0<\/orig><CST>90<\/CST><modBC>3<\/modBC><vBC>100\.00<\/vBC><pICMS>18\.0000<\/pICMS><vICMS>18\.00<\/vICMS><\/ICMS90>/,
    );
  });

  it("gera IPI com cEnq e usa IPINT fora dos CSTs tributados", () => {
    const trib = buildNfeXml(
      xmlDocument({ ...baseItem, ipiCst: "50", ipiVBc: 100, ipiPIpi: 10, ipiVIpi: 10 }),
    );
    assert.match(
      trib,
      /<IPI><cEnq>999<\/cEnq><IPITrib><CST>50<\/CST><vBC>100\.00<\/vBC><pIPI>10\.0000<\/pIPI><vIPI>10\.00<\/vIPI><\/IPITrib><\/IPI>/,
    );
    const nt = buildNfeXml(xmlDocument({ ...baseItem, ipiCst: "53" }));
    assert.match(nt, /<IPI><cEnq>999<\/cEnq><IPINT><CST>53<\/CST><\/IPINT><\/IPI>/);
  });

  it("gera todas as tags obrigatorias do ICMSTot na ordem do layout", () => {
    const xml = buildNfeXml(xmlDocument({ ...baseItem, icmsCst: "00", ...own }));
    const tot = xml.slice(xml.indexOf("<ICMSTot>"), xml.indexOf("</ICMSTot>"));
    const order = [...tot.matchAll(/<(\w+)>[^<]*<\/\1>/g)].map((match) => match[1]);
    assert.deepEqual(order, [
      "vBC",
      "vICMS",
      "vICMSDeson",
      "vFCP",
      "vBCST",
      "vST",
      "vFCPST",
      "vFCPSTRet",
      "vProd",
      "vFrete",
      "vSeg",
      "vDesc",
      "vII",
      "vIPI",
      "vIPIDevol",
      "vPIS",
      "vCOFINS",
      "vOutro",
      "vNF",
    ]);
  });
});

describe("DIFAL", () => {
  const difalRates = { icmsCst: "00", pIcms: 12, pIcmsUfDest: 18, pIcmsInter: 12, pFcpUfDest: 2 };

  it("calcula por base unica (por fora)", () => {
    const tax = calculateItemTax(amounts, { ...difalRates, difalCalculation: "1" });
    assert.equal(tax.vBcUfDest, 100);
    assert.equal(tax.vIcmsUfDest, 6);
    assert.equal(tax.vIcmsUfRemet, 0);
    assert.equal(tax.vBcFcpUfDest, 100);
    assert.equal(tax.vFcpUfDest, 2);
  });

  it("calcula por base dupla (por dentro)", () => {
    const tax = calculateItemTax(amounts, { ...difalRates, difalCalculation: "2" });
    assert.equal(tax.vBcUfDest, 110);
    assert.equal(tax.vIcmsUfDest, 7.8);
    assert.equal(tax.vBcFcpUfDest, 110);
    assert.equal(tax.vFcpUfDest, 2.2);
    const totals = sumInvoiceTotals([{ amounts, tax }]);
    assert.equal(totals.vIcmsUfDest, 7.8);
    assert.equal(totals.vFcpUfDest, 2.2);
    assert.equal(totals.vNf, 100);
  });

  const operation: ResolvedStateOperation = {
    id: "00000000-0000-4000-8000-000000000010",
    uf: "BA",
    cfop: "6108",
    cfopDescription: "Venda a nao contribuinte",
    origin: "0",
    cst: "00",
    taxationType: "1",
    interstateAliquot: "7",
    internalAliquot: "20.5",
    fcpAliquot: "2",
    difalCalculation: "2",
    calculatesDifal: true,
  };
  const item = {
    productsEnterprisesId: "00000000-0000-4000-8000-000000000001",
    nItem: 1,
    xProd: "Produto",
    vProd: 100,
  };
  const context = { interstate: true, mod: "55", indFinal: "1", indIeDest: "9" };

  it("preenche as aliquotas do estado quando o DIFAL se aplica", () => {
    const filled = fillItemDifal(item, operation, context);
    assert.equal(filled.tax?.pIcmsUfDest, 20.5);
    assert.equal(filled.tax?.pIcmsInter, 7);
    assert.equal(filled.tax?.pIcmsInterPart, 100);
    assert.equal(filled.tax?.pFcpUfDest, 2);
    assert.equal(filled.tax?.difalCalculation, "2");
  });

  it("nao aplica DIFAL fora das condicoes", () => {
    const cases: Array<[ResolvedStateOperation, typeof context]> = [
      [operation, { ...context, interstate: false }],
      [operation, { ...context, mod: "65" }],
      [operation, { ...context, indFinal: "0" }],
      [operation, { ...context, indIeDest: "1" }],
      [{ ...operation, calculatesDifal: false }, context],
      [{ ...operation, difalCalculation: "0" }, context],
      [{ ...operation, difalCalculation: null }, context],
    ];
    for (const [op, ctx] of cases) {
      assert.equal(fillItemDifal(item, op, ctx).tax?.pIcmsUfDest, undefined);
    }
  });

  it("gera o grupo ICMSUFDest e os totais do DIFAL no XML", () => {
    const document = xmlDocument({
      nItem: 1,
      xProd: "Produto",
      cfop: "6108",
      vProd: 100,
      icmsOrig: "0",
      icmsCst: "00",
      icmsVBc: 100,
      icmsPIcms: 7,
      icmsVIcms: 7,
      cofinsCst: "07",
      icmsVBcUfDest: 110,
      icmsVBcFcpUfDest: 110,
      icmsPFcpUfDest: 2,
      icmsPIcmsUfDest: 20.5,
      icmsPIcmsInter: 7,
      icmsPIcmsInterPart: 100,
      icmsVFcpUfDest: 2.2,
      icmsVIcmsUfDest: 15.55,
      icmsVIcmsUfRemet: 0,
    });
    const xml = buildNfeXml({
      ...document,
      vIcmsDeson: 0,
      vFcpUfDest: 2.2,
      vIcmsUfDest: 15.55,
      vIcmsUfRemet: 0,
    });
    assert.match(
      xml,
      /<COFINSNT><CST>07<\/CST><\/COFINSNT><\/COFINS><ICMSUFDest><vBCUFDest>110\.00<\/vBCUFDest><vBCFCPUFDest>110\.00<\/vBCFCPUFDest><pFCPUFDest>2\.0000<\/pFCPUFDest><pICMSUFDest>20\.5000<\/pICMSUFDest><pICMSInter>7\.0000<\/pICMSInter><pICMSInterPart>100\.0000<\/pICMSInterPart><vFCPUFDest>2\.20<\/vFCPUFDest><vICMSUFDest>15\.55<\/vICMSUFDest><vICMSUFRemet>0\.00<\/vICMSUFRemet><\/ICMSUFDest><\/imposto>/,
    );
    assert.match(
      xml,
      /<vICMSDeson>0\.00<\/vICMSDeson><vFCPUFDest>2\.20<\/vFCPUFDest><vICMSUFDest>15\.55<\/vICMSUFDest><vICMSUFRemet>0\.00<\/vICMSUFRemet><vFCP>/,
    );
  });

  it("omite ICMSUFDest e os totais do DIFAL quando nao ha DIFAL", () => {
    const xml = buildNfeXml(xmlDocument({ nItem: 1, xProd: "Produto", vProd: 100, icmsCst: "00" }));
    assert.equal(xml.includes("ICMSUFDest"), false);
    assert.equal(xml.includes("vFCPUFDest"), false);
  });
});
