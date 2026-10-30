import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../../src/shared/errors/app-error.js";
import { resolveConsultaCadastroUrl } from "../../src/modules/nfe/sefaz/endpoints.js";
import {
  buildConsCadXml,
  buildConsultaCadastroSoapEnvelope,
  parseRetConsCad,
} from "../../src/modules/nfe/sefaz/consulta-cadastro-xml.js";
import { consultaCadastroQuerySchema } from "../../src/modules/nfe/schema.js";

const soap = (inner: string) =>
  `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body>` +
  `<nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/CadConsultaCadastro4">` +
  `<retConsCad versao="2.00" xmlns="http://www.portalfiscal.inf.br/nfe"><infCons>${inner}</infCons></retConsCad>` +
  `</nfeResultMsg></soap:Body></soap:Envelope>`;

const infCad = (ie: string) =>
  `<infCad><IE>${ie}</IE><CNPJ>01234567000189</CNPJ><UF>SP</UF><cSit>1</cSit>` +
  `<indCredNFe>1</indCredNFe><indCredCTe>4</indCredCTe><xNome>EMPRESA LTDA</xNome>` +
  `<xFant>EMPRESA</xFant><xRegApur>NORMAL</xRegApur><CNAE>4744099</CNAE>` +
  `<dIniAtiv>2010-01-15</dIniAtiv><dUltSit>2010-01-15</dUltSit>` +
  `<ender><xLgr>RUA X</xLgr><nro>100</nro><xBairro>CENTRO</xBairro>` +
  `<cMun>3550308</cMun><xMun>SAO PAULO</xMun><CEP>01001000</CEP></ender></infCad>`;

describe("nfe consulta cadastro xml", () => {
  it("gera ConsCad para CNPJ, CPF e IE", () => {
    assert.equal(
      buildConsCadXml({ uf: "SP", documento: { tipo: "cnpj", valor: "01234567000189" } }),
      '<ConsCad versao="2.00" xmlns="http://www.portalfiscal.inf.br/nfe"><infCons><xServ>CONS-CAD</xServ><UF>SP</UF><CNPJ>01234567000189</CNPJ></infCons></ConsCad>',
    );
    assert.match(
      buildConsCadXml({ uf: "GO", documento: { tipo: "cpf", valor: "01234567890" } }),
      /<UF>GO<\/UF><CPF>01234567890<\/CPF>/,
    );
    assert.match(
      buildConsCadXml({ uf: "MG", documento: { tipo: "ie", valor: "0012345678" } }),
      /<IE>0012345678<\/IE>/,
    );
    assert.match(
      buildConsultaCadastroSoapEnvelope("<ConsCad/>"),
      /<nfeDadosMsg xmlns="http:\/\/www.portalfiscal.inf.br\/nfe\/wsdl\/CadConsultaCadastro4"><ConsCad\/><\/nfeDadosMsg>/,
    );
  });

  it("interpreta 111 preservando zeros a esquerda", () => {
    const parsed = parseRetConsCad(
      soap(
        `<verAplic>SP</verAplic><cStat>111</cStat><xMotivo>Consulta cadastro com uma ocorrencia</xMotivo>` +
          `<UF>SP</UF><CNPJ>01234567000189</CNPJ><dhCons>2026-10-02T10:30:00-03:00</dhCons><cUF>35</cUF>` +
          infCad("012345678901"),
      ),
    );
    assert.equal(parsed.encontrado, true);
    assert.equal(parsed.dhCons, "2026-10-02T10:30:00-03:00");
    assert.equal(parsed.contribuintes.length, 1);
    const [c] = parsed.contribuintes;
    assert.equal(c?.ie, "012345678901");
    assert.equal(c?.cnpj, "01234567000189");
    assert.equal(c?.cpf, null);
    assert.equal(c?.situacaoDescricao, "Habilitado");
    assert.equal(c?.endereco?.cep, "01001000");
    assert.equal(c?.endereco?.complemento, null);
  });

  it("interpreta 112 com varias IEs", () => {
    const parsed = parseRetConsCad(
      soap(
        `<cStat>112</cStat><xMotivo>Consulta cadastro com mais de uma ocorrencia</xMotivo><UF>SP</UF>` +
          infCad("111111111111") +
          infCad("222222222222"),
      ),
    );
    assert.equal(parsed.encontrado, true);
    assert.deepEqual(
      parsed.contribuintes.map((c) => c.ie),
      ["111111111111", "222222222222"],
    );
  });

  it("rejeicao 259 volta sem contribuintes", () => {
    const parsed = parseRetConsCad(
      soap(`<cStat>259</cStat><xMotivo>Rejeicao: CNPJ da consulta nao cadastrado como contribuinte na UF</xMotivo><UF>SP</UF>`),
    );
    assert.equal(parsed.encontrado, false);
    assert.equal(parsed.cStat, "259");
    assert.deepEqual(parsed.contribuintes, []);
  });

  it("SOAP Fault vira erro", () => {
    assert.throws(
      () =>
        parseRetConsCad(
          `<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope"><soap:Body><soap:Fault><soap:Reason><soap:Text>falhou</soap:Text></soap:Reason></soap:Fault></soap:Body></soap:Envelope>`,
        ),
      AppError,
    );
  });
});

describe("nfe consulta cadastro endpoints", () => {
  it("resolve SP, SC via SVRS e recusa UF sem o servico", () => {
    assert.equal(
      resolveConsultaCadastroUrl({ uf: "SP", ambiente: 1 }),
      "https://nfe.fazenda.sp.gov.br/ws/cadconsultacadastro4.asmx",
    );
    assert.equal(
      resolveConsultaCadastroUrl({ uf: "SC", ambiente: 2 }),
      "https://cad.svrs.rs.gov.br/ws/cadconsultacadastro/cadconsultacadastro4.asmx",
    );
    assert.throws(
      () => resolveConsultaCadastroUrl({ uf: "RJ", ambiente: 1 }),
      AppError,
    );
  });
});

describe("nfe consulta cadastro query", () => {
  it("aceita um documento e limpa a mascara", () => {
    const parsed = consultaCadastroQuerySchema.parse({
      uf: "sp",
      cnpj: "01.234.567/0001-89",
    });
    assert.equal(parsed.uf, "SP");
    assert.equal(parsed.cnpj, "01234567000189");
  });

  it("recusa nenhum ou mais de um documento", () => {
    assert.equal(consultaCadastroQuerySchema.safeParse({ uf: "SP" }).success, false);
    assert.equal(
      consultaCadastroQuerySchema.safeParse({
        uf: "SP",
        cnpj: "01234567000189",
        cpf: "01234567890",
      }).success,
      false,
    );
  });
});
