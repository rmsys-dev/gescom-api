import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildProcNFeXml } from "../../src/modules/nfe/sefaz/autorizacao-xml.js";
import { buildNfeXml, type NfeXmlDocument } from "../../src/modules/nfe/sefaz/nfe-xml.js";
import { code128Svg, qrCodeSvg } from "../../src/modules/nfe/danfe/barcode.js";
import { renderDanfeHtml } from "../../src/modules/nfe/danfe/danfe-html.js";
import { renderDanfeNfceHtml } from "../../src/modules/nfe/danfe/danfe-nfce-html.js";
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
      items: Array.from({ length: 12 }, () => model.items[0]!),
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

  it("monta os campos da reforma tributaria conforme a NT 2026.010", () => {
    const base = document(1);
    const xml = buildNfeXml({
      ...base,
      items: [
        {
          ...base.items[0]!,
          ibsCbsCst: "000",
          ibsCbsCClassTrib: "000001",
          ibsCbsVBc: 20,
          ibsUfPIbs: 0.1,
          ibsUfVIbs: 0.02,
          ibsMunPIbs: 0,
          ibsMunVIbs: 0,
          ibsVIbs: 0.02,
          cbsPCbs: 0.9,
          cbsPRedAliq: 50,
          cbsPAliqEfet: 0.45,
          cbsVCbs: 0.09,
        },
      ],
      vBcIbsCbs: 20,
      vIbsUf: 0.02,
      vIbsMun: 0,
      vIbs: 0.02,
      vCbs: 0.09,
    });
    const model = parseDanfeXml(xml);
    const item = model.items[0]!;
    assert.equal(model.emit.crt, "3");
    assert.equal(item.cClassTrib, "000001");
    assert.equal(item.cstIbsCbs, "000");
    assert.equal(Number(item.vBcIbsCbs), 20);
    assert.equal(Number(item.pIbsUf), 0.1);
    assert.equal(Number(item.pCbs), 0.45);
    assert.equal(Number(item.vCbs), 0.09);
    assert.equal(Number(model.totals.vIbsUf), 0.02);
    assert.equal(Number(model.totals.vCbs), 0.09);
    assert.equal(model.totals.mono, null);
    assert.equal(model.totals.issqn, null);

    const html = renderDanfeHtml(model);
    assert.match(html, /TOTAL DO IBS \/ CBS \/ IS/i);
    assert.match(html, /Total do ICMS \/ IPI/);
    assert.match(html, /Total dos produtos e total da nota/);
    assert.match(html, /Código do regime tributário/);
    assert.match(html, /Regime normal/i);
    assert.match(html, /\[NCM 12345678\] \[cClassTrib 000001\]/);
    assert.match(html, /BASES DE CÁLCULO/);
    assert.match(html, /VALOR DOS TRIBUTOS/);
    assert.doesNotMatch(html, /Cálculo do ISSQN/);
    assert.doesNotMatch(html, /monofásic/);
    assert.doesNotMatch(html, /FCP/);
  });

  it("sem grupo IBSCBS mostra os totais zerados e o item sem cClassTrib", () => {
    const html = renderDanfeHtml(parseDanfeXml(buildNfeXml(document(1))));
    assert.match(html, /TOTAL DO IBS \/ CBS \/ IS/i);
    assert.match(html, /\[NCM 12345678\]/);
    assert.doesNotMatch(html, /cClassTrib/);
  });

  it("emite infAdProd numa linha só e o DANFE mostra no item", () => {
    const base = document(1);
    const xml = buildNfeXml({
      ...base,
      items: [{ ...base.items[0]!, infAdProd: "  Garantia 12 meses\nLote A1  " }],
    });
    assert.match(xml, /<\/imposto><infAdProd>Garantia 12 meses Lote A1<\/infAdProd><\/det>/);
    assert.equal(parseDanfeXml(xml).items[0]?.infAdProd, "Garantia 12 meses Lote A1");
    assert.doesNotMatch(buildNfeXml(base), /<infAdProd>/);
  });

  it("mostra o logo do emitente só quando informado", () => {
    const model = parseDanfeXml(buildNfeXml(document(1)));
    assert.doesNotMatch(renderDanfeHtml(model), /<img class="emit-logo"/);
    assert.match(
      renderDanfeHtml(model, { logoSrc: "data:image/png;base64,AAAA" }),
      /<img class="emit-logo" src="data:image\/png;base64,AAAA"/,
    );
  });

  it("oculta parcialmente o CPF do destinatario e do transportador; CNPJ sai completo", () => {
    const model = parseDanfeXml(buildNfeXml(document(1)));
    const html = renderDanfeHtml({
      ...model,
      dest: model.dest ? { ...model.dest, document: "12345678909" } : model.dest,
      carrierDocument: "98765432100",
    });
    assert.match(html, /\*\*\*\.456\.789-\*\*/);
    assert.match(html, /\*\*\*\.654\.321-\*\*/);
    assert.doesNotMatch(html, /123\.456\.789-09/);
    assert.doesNotMatch(html, /987\.654\.321-00/);
    const company = renderDanfeHtml({ ...model, carrierDocument: "12345678000199" });
    assert.match(company, /12\.345\.678\/0001-99/);
  });

  it("imprime o QR Code: do infNFeSupl quando existir, senao a consulta da chave", () => {
    const model = parseDanfeXml(buildNfeXml(document(1)));
    assert.equal(model.qrCode, "");
    assert.match(renderDanfeHtml(model), /<td class="qrcode"><svg/);
    const supl = parseDanfeXml(
      buildNfeXml(document(1)).replace(
        "</NFe>",
        "<infNFeSupl><qrCode>https://exemplo.gov.br/qrcode?p=123</qrCode><urlChave>exemplo.gov.br</urlChave></infNFeSupl></NFe>",
      ),
    );
    assert.equal(supl.qrCode, "https://exemplo.gov.br/qrcode?p=123");
    assert.equal(qrCodeSvg(""), "");
    assert.match(qrCodeSvg("teste"), /^<svg[^>]*viewBox="-2 -2 25 25"/);
  });

  it("monta o codigo de barras da chave", () => {
    const svg = code128Svg(chave);
    assert.match(svg, /^<svg/);
    assert.equal(code128Svg("123"), "");
  });
});

describe("DANFE NFC-e modelo 65", () => {
  const nfceXml = (tpAmb: number) =>
    buildNfeXml({ ...document(tpAmb), mod: "65" }).replace(
      "</NFe>",
      "<infNFeSupl><qrCode>https://nfce.exemplo.gov.br/qrcode?p=abc</qrCode><urlChave>www.nfce.exemplo.gov.br/consulta</urlChave></infNFeSupl></NFe>",
    );

  it("monta o cupom com chave, URL de consulta, QR Code e tarja de homologacao", () => {
    const model = parseDanfeXml(nfceXml(2));
    assert.equal(model.mod, "65");
    assert.equal(model.urlChave, "www.nfce.exemplo.gov.br/consulta");
    const html = renderDanfeNfceHtml({
      ...model,
      dest: model.dest ? { ...model.dest, document: "12345678909" } : model.dest,
    });
    assert.match(html, /Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica/);
    assert.match(html, /Consulte pela Chave de Acesso em/);
    assert.match(html, /www\.nfce\.exemplo\.gov\.br\/consulta/);
    assert.match(html, /<span>5555<\/span>/);
    assert.match(html, /<div class="qrcode"><svg/);
    assert.match(html, /EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL/);
    assert.match(html, /CONSUMIDOR - CPF \*\*\*\.456\.789-\*\*/);
    assert.doesNotMatch(html, /123\.456\.789-09/);
    assert.match(html, /QTD\. TOTAL DE ITENS/);
    assert.match(html, /Dinheiro/);
  });

  it("sem destinatario sai consumidor nao identificado e producao sem tarja", () => {
    const model = parseDanfeXml(nfceXml(1));
    const html = renderDanfeNfceHtml({ ...model, dest: null });
    assert.match(html, /CONSUMIDOR NÃO IDENTIFICADO/);
    assert.doesNotMatch(html, /SEM VALOR FISCAL/);
  });
});
