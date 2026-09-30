import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HOMOLOGATION_DEST_NAME,
  HOMOLOGATION_ITEM_NAME,
  buildNfeXml,
} from "../../src/modules/nfe/sefaz/nfe-xml.js";
import { resolveAutorizacaoUrl } from "../../src/modules/nfe/sefaz/endpoints.js";
import {
  buildEnviNFeXml,
  buildProcNFeXml,
  parseRetEnviNFe,
} from "../../src/modules/nfe/sefaz/autorizacao-xml.js";
import { nfeProcXmlRelativePath } from "../../src/modules/nfe/sefaz/xml-path.js";

const signed = `<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe${"5".repeat(44)}"/></NFe>`;

describe("autorizacao da NF-e", () => {
  it("monta o lote sincrono com a NF-e assinada", () => {
    const lote = buildEnviNFeXml(signed, "10");
    assert.match(lote, /<indSinc>1<\/indSinc>/);
    assert.match(lote, /<idLote>10<\/idLote>/);
    assert.equal(lote.includes("<?xml"), false);
    assert.match(lote, /<NFe xmlns="http:\/\/www.portalfiscal.inf.br\/nfe">/);
  });

  it("le o protocolo autorizado e monta o procNFe", () => {
    const chave = "52260912345678000191550010000000011234567890";
    const soap =
      `<retEnviNFe versao="4.00"><cStat>104</cStat><xMotivo>Lote processado</xMotivo>` +
      `<protNFe versao="4.00"><infProt><tpAmb>2</tpAmb><chNFe>${chave}</chNFe>` +
      `<dhRecbto>2026-09-30T18:00:00-03:00</dhRecbto><nProt>152260000000001</nProt>` +
      `<digVal>abc=</digVal><cStat>100</cStat><xMotivo>Autorizado o uso da NF-e</xMotivo>` +
      `</infProt></protNFe></retEnviNFe>`;
    const parsed = parseRetEnviNFe(soap);
    assert.equal(parsed.authorized, true);
    assert.equal(parsed.cStat, "100");
    assert.equal(parsed.chNFe, chave);
    assert.equal(parsed.nProt, "152260000000001");
    const proc = buildProcNFeXml(signed, parsed.protNFeXml ?? "");
    assert.match(proc, /^<\?xml version="1.0" encoding="UTF-8"\?><nfeProc /);
    assert.match(proc, /<protNFe versao="4.00">/);
  });

  it("marca rejeicao e denegacao pelo cStat do protocolo", () => {
    const rejected = parseRetEnviNFe(
      `<retEnviNFe><cStat>104</cStat><xMotivo>Lote processado</xMotivo>` +
        `<protNFe><infProt><cStat>539</cStat><xMotivo>Duplicidade</xMotivo></infProt></protNFe></retEnviNFe>`,
    );
    assert.equal(rejected.authorized, false);
    assert.equal(rejected.denied, false);
    assert.equal(rejected.cStat, "539");

    const denied = parseRetEnviNFe(
      `<retEnviNFe><protNFe><infProt><cStat>302</cStat><xMotivo>Uso denegado</xMotivo></infProt></protNFe></retEnviNFe>`,
    );
    assert.equal(denied.denied, true);

    const chave = "52260912345678000191550010000000011234567890";
    const duplicate = parseRetEnviNFe(
      `<retEnviNFe><cStat>104</cStat><xMotivo>Lote processado</xMotivo>` +
        `<protNFe><infProt><chNFe>${chave}</chNFe><cStat>204</cStat>` +
        `<xMotivo>Rejeicao: Duplicidade de NF-e [nProt:152260000000001][dhRecbto:2026-09-30T19:50:50-03:00]</xMotivo>` +
        `</infProt></protNFe></retEnviNFe>`,
    );
    assert.equal(duplicate.authorized, true);
    assert.equal(duplicate.chNFe, chave);
    assert.equal(duplicate.nProt, "152260000000001");
    assert.equal(duplicate.dhRecbto, "2026-09-30T19:50:50-03:00");
  });

  it("aponta a autorizacao de GO e o arquivo proc na mesma pasta", () => {
    assert.equal(
      resolveAutorizacaoUrl({ uf: "GO", modelo: "55", ambiente: 2 }),
      "https://homolog.sefaz.go.gov.br/nfe/services/NFeAutorizacao4",
    );
    assert.equal(
      resolveAutorizacaoUrl({ uf: "GO", modelo: "65", ambiente: 1 }),
      "https://nfe.sefaz.go.gov.br/nfe/services/NFeAutorizacao4",
    );
    assert.equal(
      nfeProcXmlRelativePath({
        cnpj: "12345678000199",
        dhEmi: new Date("2026-10-01T01:30:00.000Z"),
        chave: "5".repeat(44),
      }),
      `12345678000199/2026/09/${"5".repeat(44)}-procNFe.xml`,
    );
  });

  it("troca o nome em homologacao", () => {
    const withDest = buildNfeXml({
      chave: "5".repeat(44),
      cUf: "52",
      cNf: "12345678",
      mod: "55",
      serie: "1",
      nNf: 1,
      dhEmi: "2026-09-30T10:00:00-03:00",
      cMunFg: 5208707,
      tpEmis: 1,
      tpAmb: 2,
      emit: { cnpj: "00000000000191", xNome: "Empresa" },
      dest: { cnpj: "00000000000272", xNome: "Cliente Real" },
      items: [{ nItem: 1, xProd: "Produto", vProd: 10 }],
      payments: [],
    });
    assert.match(withDest, new RegExp(`<xNome>${HOMOLOGATION_DEST_NAME}</xNome>`));
    assert.equal(withDest.includes("Cliente Real"), false);

    const withoutDest = buildNfeXml({
      chave: "5".repeat(44),
      cUf: "52",
      cNf: "12345678",
      mod: "65",
      serie: "1",
      nNf: 1,
      dhEmi: "2026-09-30T10:00:00-03:00",
      cMunFg: 5208707,
      tpEmis: 1,
      tpAmb: 2,
      emit: { cnpj: "00000000000191", xNome: "Loja" },
      items: [{ nItem: 1, xProd: "Produto", vProd: 10 }],
      payments: [],
    });
    assert.match(withoutDest, new RegExp(`<xProd>${HOMOLOGATION_ITEM_NAME}</xProd>`));
  });
});
