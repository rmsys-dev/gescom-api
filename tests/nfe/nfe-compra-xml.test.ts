import assert from "node:assert/strict";
import { gzipSync } from "node:zlib";
import { describe, it } from "node:test";
import { BadRequestError } from "../../src/shared/errors/app-error.js";
import {
  classifyDfeDocument,
  parseProcNFeCompra,
} from "../../src/modules/nfe/compras/proc-nfe.js";
import { buildNfeAccessKey } from "../../src/modules/nfe/sefaz/access-key.js";
import { resolveDistribuicaoDfeUrl } from "../../src/modules/nfe/sefaz/endpoints.js";
import {
  buildDistDFeEnvelope,
  buildDistDFeIntXml,
  parseRetDistDFe,
} from "../../src/modules/nfe/sefaz/distribuicao-xml.js";
import { nfeInboundXmlRelativePath } from "../../src/modules/nfe/sefaz/xml-path.js";

const chave = "52261012345678000199550010000000101123456789";
const empresa = "11222333000181";
const emitente = "12345678000199";

const procXml = `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
  <NFe>
    <infNFe Id="NFe${chave}" versao="4.00">
      <ide>
        <cUF>52</cUF>
        <cNF>12345678</cNF>
        <mod>55</mod>
        <serie>1</serie>
        <nNF>10</nNF>
        <dhEmi>2026-10-15T10:00:00-03:00</dhEmi>
        <cMunFG>5208707</cMunFG>
        <tpEmis>1</tpEmis>
        <tpAmb>2</tpAmb>
      </ide>
      <emit><CNPJ>${emitente}</CNPJ><xNome>Fornecedor Teste</xNome></emit>
      <dest><CNPJ>${empresa}</CNPJ></dest>
      <total><ICMSTot><vNF>10.5</vNF></ICMSTot></total>
    </infNFe>
  </NFe>
  <protNFe>
    <infProt>
      <chNFe>${chave}</chNFe>
      <nProt>152260000000001</nProt>
      <cStat>100</cStat>
      <xMotivo>Autorizado o uso da NF-e</xMotivo>
    </infProt>
  </protNFe>
</nfeProc>`;

describe("compra: caminho do procNFe", () => {
  it("separa a compra na pasta do CNPJ da empresa e do emitente", () => {
    assert.equal(
      nfeInboundXmlRelativePath({
        cnpj: empresa,
        emitCnpj: emitente,
        dhEmi: new Date("2026-10-15T10:00:00-03:00"),
        chave,
      }),
      `${empresa}/entrada/${emitente}/2026/10/${chave}-procNFe.xml`,
    );
  });

  it("usa o mes da emissao no fuso de Sao Paulo", () => {
    assert.equal(
      nfeInboundXmlRelativePath({
        cnpj: empresa,
        emitCnpj: emitente,
        dhEmi: new Date("2026-10-01T01:30:00.000Z"),
        chave,
      }),
      `${empresa}/entrada/${emitente}/2026/09/${chave}-procNFe.xml`,
    );
  });
});

describe("compra: procNFe", () => {
  it("le a identificacao da nota autorizada", () => {
    const nota = parseProcNFeCompra(procXml);
    assert.equal(nota.chave, chave);
    assert.equal(nota.emitCnpj, emitente);
    assert.equal(nota.destCnpj, empresa);
    assert.equal(nota.nNf, 10);
    assert.equal(nota.tpAmb, 2);
    assert.equal(nota.cMunFg, 5208707);
    assert.equal(nota.nProt, "152260000000001");
    assert.equal(nota.vNf, "10.50");
  });

  it("aceita emitente ou destinatario pessoa fisica", () => {
    const emitenteCpf = "64079805187";
    const chaveCpf = buildNfeAccessKey({
      cUf: "52",
      yearMonth: "2610",
      cnpj: emitenteCpf,
      mod: "55",
      serie: "1",
      nNf: 10,
      tpEmis: 1,
      cNf: "12345678",
    });
    const comEmitenteCpf = procXml
      .replaceAll(chave, chaveCpf)
      .replace(`<CNPJ>${emitente}</CNPJ>`, `<CPF>${emitenteCpf}</CPF>`);
    const emitentePessoa = parseProcNFeCompra(comEmitenteCpf);
    assert.equal(emitentePessoa.emitCpf, emitenteCpf);
    assert.equal(emitentePessoa.emitCnpj, "");
    assert.equal(emitentePessoa.destCnpj, empresa);

    const destinatarioCpf = "12345678901";
    const comDestinatarioCpf = procXml.replace(
      `<dest><CNPJ>${empresa}</CNPJ></dest>`,
      `<dest><CPF>${destinatarioCpf}</CPF></dest>`,
    );
    const destinatarioPessoa = parseProcNFeCompra(comDestinatarioCpf);
    assert.equal(destinatarioPessoa.destCpf, destinatarioCpf);
    assert.equal(destinatarioPessoa.destCnpj, "");
  });

  it("recusa resumo e xml sem protocolo", () => {
    assert.throws(
      () => parseProcNFeCompra("<resNFe><chNFe>1</chNFe></resNFe>"),
      (error: unknown) =>
        error instanceof BadRequestError && error.code === "NFE_COMPRA_XML_INVALID",
    );
  });
});

describe("compra: distribuicao DF-e", () => {
  it("aponta homologacao e producao para o Ambiente Nacional", () => {
    assert.equal(
      resolveDistribuicaoDfeUrl(2),
      "https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx",
    );
    assert.equal(
      resolveDistribuicaoDfeUrl(1),
      "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx",
    );
  });

  it("monta consulta por chave e por NSU", () => {
    const porChave = buildDistDFeIntXml({
      tpAmb: 2,
      cUfAutor: "52",
      cnpj: empresa,
      chave,
    });
    assert.match(porChave, new RegExp(`<chNFe>${chave}</chNFe>`));
    assert.doesNotMatch(porChave, /distNSU/);
    const porFila = buildDistDFeIntXml({
      tpAmb: 1,
      cUfAutor: "52",
      cnpj: empresa,
      ultNsu: "10",
    });
    assert.match(porFila, /<ultNSU>000000000000010<\/ultNSU>/);
    assert.doesNotMatch(porFila, /consChNFe/);
  });

  it("envolve o distDFeInt na operacao nfeDistDFeInteresse", () => {
    const envelope = buildDistDFeEnvelope({
      tpAmb: 2,
      cUfAutor: "52",
      cnpj: empresa,
      ultNsu: "0",
    });
    assert.match(
      envelope,
      /<nfeDistDFeInteresse xmlns="http:\/\/www\.portalfiscal\.inf\.br\/nfe\/wsdl\/NFeDistribuicaoDFe">/,
    );
    assert.match(envelope, /<nfeDadosMsg><distDFeInt /);
    assert.equal(envelope.match(/<nfeDadosMsg/g)?.length, 1);
  });

  it("abre o docZip e distingue resumo de procNFe", () => {
    const resumo = "<resNFe><chNFe>1</chNFe></resNFe>";
    const zip = gzipSync(Buffer.from(resumo, "utf8")).toString("base64");
    const soap =
      `<soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body>` +
      `<retDistDFeInt versao="1.01"><cStat>138</cStat><xMotivo>Documento localizado</xMotivo>` +
      `<ultNSU>10</ultNSU><maxNSU>20</maxNSU><loteDistDFeInt>` +
      `<docZip NSU="10" schema="resNFe_v1.01.xsd">${zip}</docZip>` +
      `</loteDistDFeInt></retDistDFeInt></soap12:Body></soap12:Envelope>`;
    const parsed = parseRetDistDFe(soap);
    assert.equal(parsed.cStat, "138");
    assert.equal(parsed.ultNsu, "000000000000010");
    assert.equal(parsed.maxNsu, "000000000000020");
    assert.equal(parsed.documentos.length, 1);
    assert.equal(
      classifyDfeDocument(parsed.documentos[0]?.schema, parsed.documentos[0]?.xml ?? ""),
      "resumo",
    );
    assert.equal(classifyDfeDocument("procNFe_v4.00.xsd", procXml), "proc");
  });
});
