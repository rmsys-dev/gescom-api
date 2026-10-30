import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ConflictError } from "../../src/shared/errors/app-error.js";
import { createManifestacaoSchema } from "../../src/modules/nfe/manifestacao/schema.js";
import {
  assertManifestacaoPermitida,
  parseChaveManifestacao,
} from "../../src/modules/nfe/manifestacao/rules.js";
import { resolveRecepcaoEventoAnUrl } from "../../src/modules/nfe/sefaz/endpoints.js";
import {
  CORGAO_AMBIENTE_NACIONAL,
  DESC_EVENTO_CIENCIA_OPERACAO,
  DESC_EVENTO_CONFIRMACAO_OPERACAO,
  DESC_EVENTO_DESCONHECIMENTO_OPERACAO,
  DESC_EVENTO_OPERACAO_NAO_REALIZADA,
  TP_EVENTO_CIENCIA_OPERACAO,
  TP_EVENTO_CONFIRMACAO_OPERACAO,
  TP_EVENTO_DESCONHECIMENTO_OPERACAO,
  TP_EVENTO_OPERACAO_NAO_REALIZADA,
  buildEventoXml,
} from "../../src/modules/nfe/sefaz/evento-xml.js";

const chave = "52261012345678000199550010000000101123456789";
const chaveNfce = "52261012345678000199650010000000101123456781";
const cnpj = "99888777000166";
const xJust = "Mercadoria nao entregue no endereco & prazo";

const evento = (
  detalhe: Parameters<typeof buildEventoXml>[0]["detalhe"],
) =>
  buildEventoXml({
    cOrgao: CORGAO_AMBIENTE_NACIONAL,
    tpAmb: 2,
    cnpj,
    chNFe: chave,
    dhEvento: "2026-10-17T15:00:00-03:00",
    nSeqEvento: 1,
    detalhe,
  });

describe("manifestacao: XML do evento", () => {
  it("monta ciencia, confirmacao e desconhecimento sem justificativa", () => {
    const casos = [
      [TP_EVENTO_CIENCIA_OPERACAO, DESC_EVENTO_CIENCIA_OPERACAO],
      [TP_EVENTO_CONFIRMACAO_OPERACAO, DESC_EVENTO_CONFIRMACAO_OPERACAO],
      [TP_EVENTO_DESCONHECIMENTO_OPERACAO, DESC_EVENTO_DESCONHECIMENTO_OPERACAO],
    ] as const;
    for (const [tpEvento, descEvento] of casos) {
      const xml = evento({ tpEvento });
      assert.ok(xml.includes(`<infEvento Id="ID${tpEvento}${chave}01">`));
      assert.ok(xml.includes("<cOrgao>91</cOrgao>"));
      assert.ok(xml.includes(`<CNPJ>${cnpj}</CNPJ>`));
      assert.ok(xml.includes(`<tpEvento>${tpEvento}</tpEvento>`));
      assert.ok(xml.includes("<nSeqEvento>1</nSeqEvento>"));
      assert.ok(xml.includes(`<descEvento>${descEvento}</descEvento>`));
      assert.equal(xml.includes("<xJust>"), false);
    }
  });

  it("monta operacao nao realizada com a justificativa escapada", () => {
    const xml = evento({
      tpEvento: TP_EVENTO_OPERACAO_NAO_REALIZADA,
      xJust,
    });
    assert.ok(xml.includes(`<descEvento>${DESC_EVENTO_OPERACAO_NAO_REALIZADA}</descEvento>`));
    assert.ok(
      xml.includes(
        "<xJust>Mercadoria nao entregue no endereco &amp; prazo</xJust>",
      ),
    );
  });
});

describe("manifestacao: chave", () => {
  it("aceita NF-e 55 e le o CNPJ do emitente", () => {
    assert.deepEqual(parseChaveManifestacao(chave), {
      chave,
      emitCnpj: "12345678000199",
    });
  });

  it("recusa digito verificador invalido e modelo 65", () => {
    assert.throws(
      () => parseChaveManifestacao(`${chave.slice(0, 43)}0`),
      /Chave de acesso invalida/,
    );
    assert.throws(
      () => parseChaveManifestacao(chaveNfce),
      /modelo 55/,
    );
  });
});

describe("manifestacao: regra local", () => {
  it("permite ciencia e, depois dela, um evento final", () => {
    assert.doesNotThrow(() => assertManifestacaoPermitida([], "CIENCIA"));
    assert.doesNotThrow(() =>
      assertManifestacaoPermitida(["CIENCIA"], "CONFIRMACAO"),
    );
  });

  it("recusa o mesmo tipo e qualquer evento depois de um final", () => {
    assert.throws(
      () => assertManifestacaoPermitida(["CIENCIA"], "CIENCIA"),
      (error: unknown) =>
        error instanceof ConflictError && error.code === "NFE_MANIFESTACAO_DUPLICADA",
    );
    assert.throws(
      () => assertManifestacaoPermitida(["CONFIRMACAO"], "DESCONHECIMENTO"),
      (error: unknown) =>
        error instanceof ConflictError && error.code === "NFE_MANIFESTACAO_FINAL",
    );
    assert.throws(
      () => assertManifestacaoPermitida(["OPERACAO_NAO_REALIZADA"], "CIENCIA"),
      (error: unknown) =>
        error instanceof ConflictError && error.code === "NFE_MANIFESTACAO_FINAL",
    );
  });
});

describe("manifestacao: corpo", () => {
  it("normaliza a chave e exige justificativa so na operacao nao realizada", () => {
    const parsed = createManifestacaoSchema.parse({
      chave: "5226 1012 3456 7800 0199 5500 1000 0000 1011 2345 6789",
      tipo: "CIENCIA",
    });
    assert.equal(parsed.chave, chave);
    assert.equal(
      createManifestacaoSchema.safeParse({
        chave,
        tipo: "OPERACAO_NAO_REALIZADA",
      }).success,
      false,
    );
    assert.equal(
      createManifestacaoSchema.safeParse({
        chave,
        tipo: "DESCONHECIMENTO",
        xJust: "Justificativa que nao cabe neste evento",
      }).success,
      false,
    );
    assert.equal(
      createManifestacaoSchema.safeParse({
        chave,
        tipo: "CIENCIA",
        xJust: "Justificativa que nao cabe neste evento",
      }).success,
      false,
    );
    const comJustificativa = createManifestacaoSchema.parse({
      chave,
      tipo: "OPERACAO_NAO_REALIZADA",
      xJust: "  Mercadoria\n  nao entregue  ",
    });
    assert.equal(comJustificativa.xJust, "Mercadoria nao entregue");
  });
});

describe("manifestacao: Ambiente Nacional", () => {
  it("aponta homologacao e producao para o endereco nacional", () => {
    assert.equal(
      resolveRecepcaoEventoAnUrl(2),
      "https://hom.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    );
    assert.equal(
      resolveRecepcaoEventoAnUrl(1),
      "https://www.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    );
  });
});
