import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProcNFeXml } from "../../src/modules/nfe/sefaz/autorizacao-xml.js";
import { buildNfeXml, type NfeXmlDocument } from "../../src/modules/nfe/sefaz/nfe-xml.js";
import { code128Svg } from "../../src/modules/nfe/danfe/barcode.js";
import { renderDanfeHtml } from "../../src/modules/nfe/danfe/danfe-html.js";
import { parseDanfeXml } from "../../src/modules/nfe/danfe/parse-xml.js";

const chave = "5".repeat(44);

const document = (tpAmb: number): NfeXmlDocument => ({
  chave,
  cUf: "52",
  cNf: "12345678",
  natOp: "Venda de mercadoria",
  mod: "55",
  serie: "1",
  nNf: 10,
  dhEmi: "2026-10-01T10:00:00-03:00",
  tpNf: "1",
  idDest: "1",
  cMunFg: "5208707",
  tpImp: "1",
  tpEmis: 1,
  cDv: "5",
  tpAmb,
  finNfe: "1",
  indFinal: "1",
  indPres: "1",
  procEmi: "0",
  verProc: "Gescom",
  emit: {
    cnpj: "12345678000199",
    xNome: "Emitente Teste",
    ie: "123456789",
    crt: "3",
    xlgr: "Rua A",
    nro: "10",
    xbairro: "Centro",
    cmun: "5208707",
    xmun: "Goiania",
    uf: "GO",
    cep: "74000000",
  },
  dest: {
    cnpj: "99888777000166",
    xNome: "Cliente Teste",
    indIeDest: "1",
    ie: "987654321",
    xlgr: "Rua B",
    nro: "20",
    xbairro: "Setor",
    cmun: "5208707",
    xmun: "Goiania",
    uf: "GO",
    cep: "74000001",
  },
  items: [
    {
      nItem: 1,
      cProd: "1",
      xProd: "Produto",
      ncm: "12345678",
      cfop: "5102",
      uCom: "UN",
      qCom: 2,
      vUnCom: 10,
      vProd: 20,
      icmsOrig: "0",
      icmsCst: "00",
      icmsVBc: 20,
      icmsPIcms: 18,
      icmsVIcms: 3.6,
    },
  ],
  payments: [{ tPag: "01", vPag: 20, indPag: "0" }],
  vBc: 20,
  vIcms: 3.6,
  vProd: 20,
  vNf: 20,
  infCpl: "Observacao da nota",
  transport: { modFrete: "9", xNome: "Transportadora" },
});

const withExtraGroups = (xml: string): string =>
  xml
    .replace(
      "</transp>",
      "<vol><qVol>2</qVol><esp>CX</esp><pesoL>1.500</pesoL><pesoB>1.800</pesoB></vol></transp>",
    )
    .replace(
      "</infNFe>",
      "<retirada><CNPJ>12345678000199</CNPJ><xNome>Deposito</xNome><xLgr>Rua C</xLgr><nro>5</nro><xBairro>Industrial</xBairro><cMun>5208707</cMun><xMun>Goiania</xMun><UF>GO</UF></retirada>" +
        "<cobr><fat><nFat>10</nFat><vOrig>20.00</vOrig><vDesc>0.00</vDesc><vLiq>20.00</vLiq></fat><dup><nDup>001</nDup><dVenc>2026-10-10</dVenc><vDup>20.00</vDup></dup></cobr>" +
        "</infNFe>",
    );

describe("DANFE modelo 55", () => {
  it("le a NF-e sem protocolo e os grupos opcionais", () => {
    const model = parseDanfeXml(withExtraGroups(buildNfeXml(document(1))));
    assert.equal(model.authorized, false);
    assert.equal(model.chave, chave);
    assert.equal(model.emit.name, "Emitente Teste");
    assert.equal(model.dest?.name, "Cliente Teste");
    assert.equal(model.retirada?.name, "Deposito");
    assert.equal(model.items[0]?.xProd, "Produto");
    assert.equal(model.items[0]?.cst, "00");
    assert.equal(model.payments[0]?.tPag, "01");
    assert.equal(model.invoiceNumber, "10");
    assert.equal(model.duplicates[0]?.nDup, "001");
    assert.equal(model.volumes[0]?.esp, "CX");
    assert.equal(model.infCpl, "Observacao da nota");
    const html = renderDanfeHtml(model);
    assert.match(html, /SEM VALOR FISCAL/);
    assert.match(html, /FOLHA 1\/1/);
    const paged = renderDanfeHtml({
      ...model,
      items: Array.from({ length: 40 }, () => model.items[0]!),
    });
    assert.match(paged, /FOLHA 1\/2/);
    assert.match(paged, /FOLHA 2\/2/);
  });

  it("le o procNFe autorizado em producao sem a tarja", () => {
    const xml = buildProcNFeXml(
      buildNfeXml(document(1)),
      `<protNFe versao="4.00"><infProt><chNFe>${chave}</chNFe><nProt>352000000000001</nProt><dhRecbto>2026-10-01T10:05:00-03:00</dhRecbto><cStat>100</cStat></infProt></protNFe>`,
    );
    const model = parseDanfeXml(xml);
    assert.equal(model.authorized, true);
    assert.equal(model.protocol, "352000000000001");
    assert.doesNotMatch(renderDanfeHtml(model), /SEM VALOR FISCAL/);
    assert.match(renderDanfeHtml(model), /352000000000001/);
  });

  it("mantem a tarja na homologacao autorizada", () => {
    const xml = buildProcNFeXml(
      buildNfeXml(document(2)),
      `<protNFe versao="4.00"><infProt><chNFe>${chave}</chNFe><nProt>1</nProt><cStat>100</cStat></infProt></protNFe>`,
    );
    const model = parseDanfeXml(xml);
    assert.equal(model.authorized, true);
    assert.equal(model.tpAmb, "2");
    assert.match(renderDanfeHtml(model), /SEM VALOR FISCAL/);
    assert.doesNotMatch(renderDanfeHtml(model), /DANFE IMPRESSO EM AMBIENTE DE HOMOLOGAÇÃO/);
  });

  it("monta o codigo de barras da chave", () => {
    const svg = code128Svg(chave);
    assert.match(svg, /^<svg/);
    assert.equal(code128Svg("123"), "");
  });
});
