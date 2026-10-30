import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseDacceXml, renderDacceHtml } from "../../src/modules/nfe/danfe/dacce-html.js";
import { correctNfeSchema } from "../../src/modules/nfe/events/schema.js";
import {
  TP_EVENTO_CARTA_CORRECAO,
  X_COND_USO_CCE,
  buildEventoXml,
  buildProcEventoNFeXml,
  eventoId,
} from "../../src/modules/nfe/sefaz/evento-xml.js";

const chave = "52261012345678000199550010000000101123456785";
const xCorrecao = "Corrigir o endereco do destinatario para Rua B, 20 & Cia";

const eventoXml = (nSeqEvento: number, tpAmb: 1 | 2 = 2) =>
  buildEventoXml({
    cOrgao: "52",
    tpAmb,
    cnpj: "12345678000199",
    chNFe: chave,
    dhEvento: "2026-10-08T09:00:00-03:00",
    nSeqEvento,
    detalhe: { tpEvento: TP_EVENTO_CARTA_CORRECAO, xCorrecao },
  });

const retEventoXml =
  `<retEvento versao="1.00"><infEvento>` +
  `<tpAmb>2</tpAmb><verAplic>GO</verAplic><cOrgao>52</cOrgao>` +
  `<cStat>135</cStat><xMotivo>Evento registrado e vinculado a NF-e</xMotivo>` +
  `<chNFe>${chave}</chNFe><tpEvento>110110</tpEvento><nSeqEvento>3</nSeqEvento>` +
  `<dhRegEvento>2026-10-08T09:00:05-03:00</dhRegEvento><nProt>152260000000001</nProt>` +
  `</infEvento></retEvento>`;

describe("CC-e: XML do evento", () => {
  it("monta o detEvento 110110 com correcao e condicao de uso", () => {
    const xml = eventoXml(3);
    assert.ok(xml.includes(`<infEvento Id="ID110110${chave}03">`));
    assert.ok(xml.includes("<tpEvento>110110</tpEvento>"));
    assert.ok(xml.includes("<nSeqEvento>3</nSeqEvento>"));
    assert.ok(xml.includes("<descEvento>Carta de Correcao</descEvento>"));
    assert.ok(xml.includes("<xCorrecao>Corrigir o endereco do destinatario para Rua B, 20 &amp; Cia</xCorrecao>"));
    assert.ok(xml.includes(`<xCondUso>${X_COND_USO_CCE}</xCondUso>`));
  });

  it("gera Id com sequencia de 2 digitos", () => {
    assert.equal(eventoId("110110", chave, 1), `ID110110${chave}01`);
    assert.equal(eventoId("110110", chave, 20), `ID110110${chave}20`);
  });
});

describe("CC-e: validacao do corpo", () => {
  it("normaliza espacos e aceita entre 15 e 1000 caracteres", () => {
    const parsed = correctNfeSchema.parse({ xCorrecao: "  Corrigir\n  o   CFOP da nota  " });
    assert.equal(parsed.xCorrecao, "Corrigir o CFOP da nota");
    assert.equal(correctNfeSchema.safeParse({ xCorrecao: "a".repeat(1000) }).success, true);
  });

  it("rejeita textos curtos, longos ou campos extras", () => {
    assert.equal(correctNfeSchema.safeParse({ xCorrecao: "curto demais" }).success, false);
    assert.equal(correctNfeSchema.safeParse({ xCorrecao: "a".repeat(1001) }).success, false);
    assert.equal(
      correctNfeSchema.safeParse({ xCorrecao: "a".repeat(20), extra: 1 }).success,
      false,
    );
  });
});

describe("CC-e: DACCe", () => {
  const procXml = buildProcEventoNFeXml(eventoXml(3), retEventoXml);

  it("le os dados do procEventoNFe", () => {
    const event = parseDacceXml(procXml);
    assert.equal(event.chave, chave);
    assert.equal(event.cnpj, "12345678000199");
    assert.equal(event.nSeqEvento, "3");
    assert.equal(event.xCorrecao, "Corrigir o endereco do destinatario para Rua B, 20 & Cia");
    assert.equal(event.xCondUso, X_COND_USO_CCE);
    assert.equal(event.nProt, "152260000000001");
    assert.equal(event.cStat, "135");
  });

  it("recusa XML de outro tipo de evento", () => {
    const cancel = buildEventoXml({
      cOrgao: "52",
      tpAmb: 2,
      cnpj: "12345678000199",
      chNFe: chave,
      dhEvento: "2026-10-08T09:00:00-03:00",
      nSeqEvento: 1,
      detalhe: { tpEvento: "110111", nProt: "152260000000001", xJust: "Justificativa de teste" },
    });
    assert.throws(() => parseDacceXml(cancel), /carta de correção/);
  });

  it("renderiza a chave, a correcao e a marca de homologacao", () => {
    const html = renderDacceHtml(parseDacceXml(procXml), {
      nNf: "10",
      serie: "1",
      dhEmi: "2026-10-01T13:00:00.000Z",
      emitName: "Emitente Teste",
      emitDocument: "12345678000199",
      emitIe: "123456789",
      emitAddress: "Rua A, 10 · Centro",
      destName: "Cliente <Teste>",
      destDocument: "12345678901",
    });
    assert.ok(html.includes("DACCe"));
    assert.ok(html.includes("<span>5226</span>"));
    assert.ok(html.includes("Rua B, 20 &amp; Cia"));
    assert.ok(html.includes("Cliente &lt;Teste&gt;"));
    assert.ok(html.includes("***.456.789-**"));
    assert.ok(html.includes("152260000000001"));
    assert.ok(html.includes("SEM VALOR FISCAL"));
  });
});
