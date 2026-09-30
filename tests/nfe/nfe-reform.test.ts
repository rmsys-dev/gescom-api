import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyPriorityClassification,
  fillItemReform,
  findPriorityOperation,
  type ResolvedStateOperation,
} from "../../src/modules/nfe/operations/product-icms.js";
import type { CreateNfeInput } from "../../src/modules/nfe/document/schema.js";
import { buildNfeXml, type NfeXmlDocument } from "../../src/modules/nfe/sefaz/nfe-xml.js";
import {
  calculateItemTax,
  sumInvoiceTotals,
} from "../../src/modules/nfe/tax/calculate.js";
import { resolveReformRates } from "../../src/modules/nfe/tax/reform-rates.js";
import { buscaAnexoNRT, type AnexoNrtOption } from "../../src/modules/nfe/operations/busca-anexo-nrt.js";

const sources = {
  cityIbsMun: 0,
  stateIbsUf: 0.1,
  stateIbsMun: 0,
  countryIbsUf: 0.05,
  countryIbsMun: 0.02,
  countryCbs: "0.9000",
  countryIs: 0,
};

const operation: ResolvedStateOperation = {
  id: "op",
  uf: "GO",
  cfop: "5102",
  cfopDescription: "Venda",
  origin: "0",
  cst: "00",
  taxationType: "1",
  classificationIbsCbsId: "class-op",
  ibsCbsCst: "200",
  pRedIbs: "60.0000",
  pRedCbs: "60.0000",
};

const item = (tax: CreateNfeInput["items"][number]["tax"] = {}) =>
  ({
    productsEnterprisesId: "p1",
    nItem: 1,
    xProd: "Produto",
    qCom: 1,
    vUnCom: 100,
    vProd: 100,
    tax,
  }) as CreateNfeInput["items"][number];

const rates = { pIbsMun: 0.02, pIbsUf: 0.1, pCbs: 0.9, pIs: 0 };

describe("taxas da reforma tributaria (pegaTaxaIS_IBS_CBS)", () => {
  it("usa a taxa municipal da cidade quando informada", () => {
    const result = resolveReformRates({ ...sources, cityIbsMun: 0.03 });
    assert.deepEqual(result, { pIbsMun: 0.03, pIbsUf: 0.1, pCbs: 0.9, pIs: 0 });
  });

  it("cai para o estado e depois para o pais na taxa municipal", () => {
    assert.equal(resolveReformRates({ ...sources, stateIbsMun: 0.04 })?.pIbsMun, 0.04);
    assert.equal(resolveReformRates(sources)?.pIbsMun, 0.02);
  });

  it("usa o IBS UF do pais quando o estado esta zerado", () => {
    assert.equal(resolveReformRates({ ...sources, stateIbsUf: 0 })?.pIbsUf, 0.05);
  });

  it("traz CBS e IS do pais", () => {
    const result = resolveReformRates({ ...sources, countryIs: 1.5 });
    assert.equal(result?.pCbs, 0.9);
    assert.equal(result?.pIs, 1.5);
  });

  it("retorna null quando CBS ou IBS UF nao estao informados", () => {
    assert.equal(resolveReformRates({ ...sources, countryCbs: 0 }), null);
    assert.equal(
      resolveReformRates({ ...sources, stateIbsUf: 0, countryIbsUf: null }),
      null,
    );
  });
});

describe("preenchimento das taxas da reforma no item", () => {
  it("nao altera o item quando nao ha taxas", () => {
    const original = item();
    assert.equal(fillItemReform(original, operation, null), original);
  });

  it("aplica taxas, classificacao e reducoes da operacao", () => {
    const tax = fillItemReform(item(), operation, rates).tax!;
    assert.equal(tax.classificationIbsCbsId, "class-op");
    assert.equal(tax.pIbsUf, 0.1);
    assert.equal(tax.pIbsMun, 0.02);
    assert.equal(tax.pCbs, 0.9);
    assert.equal(tax.pIs, undefined);
    assert.equal(tax.pRedIbsUf, 60);
    assert.equal(tax.pRedIbsMun, 60);
    assert.equal(tax.pRedCbs, 60);
  });

  it("mantem valores informados manualmente", () => {
    const tax = fillItemReform(
      item({ pCbs: 1, pRedCbs: 10 }),
      operation,
      { ...rates, pIs: 2 },
    ).tax!;
    assert.equal(tax.pCbs, 1);
    assert.equal(tax.pRedCbs, 10);
    assert.equal(tax.pIs, 2);
  });

  it("nao aplica reducoes da operacao em item com outra classificacao", () => {
    const tax = fillItemReform(
      item({ classificationIbsCbsId: "outra" }),
      operation,
      rates,
    ).tax!;
    assert.equal(tax.classificationIbsCbsId, "outra");
    assert.equal(tax.pRedIbsUf, undefined);
    assert.equal(tax.pRedCbs, undefined);
  });
});

describe("operacao com prioridade", () => {
  const priority: ResolvedStateOperation = {
    ...operation,
    id: "op-priority",
    cfop: "5405",
    cst: "60",
    classificationIbsCbsId: "class-priority",
    ibsCbsCst: "000",
    pRedIbs: null,
    pRedCbs: null,
    priority: true,
  };

  it("usa a classificacao da operacao prioritaria em todos os itens", () => {
    const otherCst = { ...priority, id: "op-priority-00", cst: "00" };
    assert.equal(findPriorityOperation([operation, priority]), priority);
    assert.equal(findPriorityOperation([operation, otherCst]), otherCst);
    assert.equal(findPriorityOperation([operation]), undefined);
    assert.equal(findPriorityOperation([{ ...priority, classificationIbsCbsId: undefined }]), undefined);
  });

  it("forca a classificacao da prioritaria em todos os itens", () => {
    const forced = applyPriorityClassification(
      item({ classificationIbsCbsId: "manual", pRedIbsUf: 30, pRedCbs: 30 }),
      operation,
      priority,
    );
    const tax = fillItemReform(forced.item, forced.operation, rates).tax!;
    assert.equal(tax.classificationIbsCbsId, "class-priority");
    assert.equal(tax.pRedIbsUf, undefined);
    assert.equal(tax.pRedCbs, undefined);
    assert.equal(forced.operation.ibsCbsCst, "000");
    assert.equal(forced.operation.cfop, "5102");
    assert.equal(forced.operation.cst, "00");
  });

  it("mantem a classificacao da operacao do item sem prioridade", () => {
    const original = item();
    const result = applyPriorityClassification(original, operation, undefined);
    assert.equal(result.item, original);
    assert.equal(result.operation, operation);
  });
});

describe("buscaAnexoNRT", () => {
  const anexo = (
    id: string,
    classificationIbsCbsId: string,
  ): AnexoNrtOption => ({
    id,
    anexo: id === "a1" ? "IX" : "X",
    legislation: "LC 214/2025",
    classificationIbsCbsId,
    ibsCbsCst: "000",
    pRedIbs: "60",
    pRedCbs: "60",
  });

  it("usa o unico anexo vigente do NCM", () => {
    assert.equal(buscaAnexoNRT([anexo("a1", "class-ix")], undefined)?.id, "a1");
  });

  it("nao escolhe anexo quando o NCM nao tem linha vigente", () => {
    assert.equal(buscaAnexoNRT([], undefined), null);
  });

  it("exige a escolha quando ha mais de um anexo vigente", () => {
    assert.throws(
      () => buscaAnexoNRT([anexo("a1", "class-ix"), anexo("a2", "class-x")], undefined),
      (err: unknown) =>
        err instanceof Error &&
        (err as { code?: string }).code === "NFE_ANEXO_RT_REQUIRED",
    );
  });

  it("usa o anexo informado quando ha mais de um", () => {
    const chosen = buscaAnexoNRT(
      [anexo("a1", "class-ix"), anexo("a2", "class-x")],
      "a2",
    );
    assert.equal(chosen?.classificationIbsCbsId, "class-x");
  });
});

describe("calculo e XML do IBS/CBS", () => {
  const amounts = { vProd: 1000 };
  const tax = calculateItemTax(amounts, {
    pIbsUf: 0.1,
    pIbsMun: 0.02,
    pCbs: 0.9,
    pRedIbsUf: 60,
    pRedIbsMun: 60,
    pRedCbs: 60,
  });

  it("calcula IBS e CBS com reducao sobre a base cheia", () => {
    assert.equal(tax.vBcIbsCbs, 1000);
    assert.equal(tax.pAliqEfetIbsUf, 0.04);
    assert.equal(tax.vIbsUf, 0.4);
    assert.equal(tax.vIbsMun, 0.08);
    assert.equal(tax.vCbs, 3.6);
    const totals = sumInvoiceTotals([{ amounts, tax }]);
    assert.equal(totals.vNf, 1000);
    assert.equal(totals.vNfTot, 1004.08);
  });

  it("gera IBSCBS no item e IBSCBSTot/vNFTot no total", () => {
    const document: NfeXmlDocument = {
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
      items: [
        {
          nItem: 1,
          xProd: "Produto",
          vProd: 1000,
          icmsCst: "00",
          ibsCbsCst: "200",
          ibsCbsCClassTrib: "200001",
          ibsCbsVBc: tax.vBcIbsCbs,
          ibsUfPIbs: 0.1,
          ibsUfPRedAliq: 60,
          ibsUfPAliqEfet: tax.pAliqEfetIbsUf,
          ibsUfVIbs: tax.vIbsUf,
          ibsMunPIbs: 0.02,
          ibsMunPRedAliq: 60,
          ibsMunPAliqEfet: tax.pAliqEfetIbsMun,
          ibsMunVIbs: tax.vIbsMun,
          ibsVIbs: tax.vIbs,
          cbsPCbs: 0.9,
          cbsPRedAliq: 60,
          cbsPAliqEfet: tax.pAliqEfetCbs,
          cbsVCbs: tax.vCbs,
        },
      ],
      payments: [{ tPag: "01", vPag: 1000 }],
      vProd: 1000,
      vNf: 1000,
      vBcIbsCbs: 1000,
      vIbsUf: 0.4,
      vIbsMun: 0.08,
      vIbs: 0.48,
      vCbs: 3.6,
      vNfTot: 1004.08,
    };
    const xml = buildNfeXml(document);
    assert.match(
      xml,
      /<\/ICMS>.*<IBSCBS><CST>200<\/CST><cClassTrib>200001<\/cClassTrib><gIBSCBS><vBC>1000\.00<\/vBC><gIBSUF><pIBSUF>0\.1000<\/pIBSUF><gRed><pRedAliq>60\.0000<\/pRedAliq><pAliqEfet>0\.0400<\/pAliqEfet><\/gRed><vIBSUF>0\.40<\/vIBSUF><\/gIBSUF><gIBSMun>.*<vIBSMun>0\.08<\/vIBSMun><\/gIBSMun><vIBS>0\.48<\/vIBS><gCBS><pCBS>0\.9000<\/pCBS>.*<vCBS>3\.60<\/vCBS><\/gCBS><\/gIBSCBS><\/IBSCBS><\/imposto>/,
    );
    assert.match(
      xml,
      /<\/ICMSTot><IBSCBSTot><vBCIBSCBS>1000\.00<\/vBCIBSCBS><gIBS><gIBSUF><vDif>0\.00<\/vDif><vDevTrib>0\.00<\/vDevTrib><vIBSUF>0\.40<\/vIBSUF><\/gIBSUF><gIBSMun>.*<vIBSMun>0\.08<\/vIBSMun><\/gIBSMun><vIBS>0\.48<\/vIBS><vCredPres>0\.00<\/vCredPres><vCredPresCondSus>0\.00<\/vCredPresCondSus><\/gIBS><gCBS>.*<vCBS>3\.60<\/vCBS>.*<\/gCBS><\/IBSCBSTot><vNFTot>1004\.08<\/vNFTot><\/total>/,
    );
  });

  it("nao gera grupos da reforma sem CST/cClassTrib", () => {
    const xml = buildNfeXml({
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
      items: [{ nItem: 1, xProd: "Produto", vProd: 100 }],
      payments: [{ tPag: "01", vPag: 100 }],
    });
    assert.equal(xml.includes("IBSCBS"), false);
    assert.equal(xml.includes("vNFTot"), false);
  });
});
