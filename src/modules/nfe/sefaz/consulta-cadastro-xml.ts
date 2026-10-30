import { XMLParser } from "fast-xml-parser";
import { CONSULTA_CADASTRO_SOAP_NAMESPACE } from "./endpoints.js";
import { sefazUnavailableError } from "./errors.js";
import type { UfSigla } from "./uf.js";

const NFE_XMLNS = "http://www.portalfiscal.inf.br/nfe";
const SOAP12_NS = "http://www.w3.org/2003/05/soap-envelope";
const CONS_CAD_VERSION = "2.00";

const FOUND = new Set(["111", "112"]);

const SITUACAO_DESCRICAO: Record<string, string> = {
  "0": "Nao habilitado",
  "1": "Habilitado",
};

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
});

export type ConsultaCadastroDocumento =
  | { tipo: "cnpj"; valor: string }
  | { tipo: "cpf"; valor: string }
  | { tipo: "ie"; valor: string };

export type ContribuinteEndereco = {
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  codigoMunicipio: string | null;
  municipio: string | null;
  cep: string | null;
};

export type Contribuinte = {
  ie: string | null;
  cnpj: string | null;
  cpf: string | null;
  uf: string | null;
  situacao: string | null;
  situacaoDescricao: string | null;
  credenciadoNfe: string | null;
  credenciadoCte: string | null;
  nome: string | null;
  fantasia: string | null;
  regimeApuracao: string | null;
  cnae: string | null;
  inicioAtividade: string | null;
  ultimaSituacao: string | null;
  baixa: string | null;
  ieUnica: string | null;
  ieAtual: string | null;
  endereco: ContribuinteEndereco | null;
};

export type ConsultaCadastroParsed = {
  cStat: string;
  xMotivo: string;
  uf: string | null;
  dhCons: string | null;
  encontrado: boolean;
  contribuintes: Contribuinte[];
};

const DOCUMENTO_TAG: Record<ConsultaCadastroDocumento["tipo"], string> = {
  cnpj: "CNPJ",
  cpf: "CPF",
  ie: "IE",
};

export const buildConsCadXml = (input: {
  uf: UfSigla;
  documento: ConsultaCadastroDocumento;
}): string => {
  const tag = DOCUMENTO_TAG[input.documento.tipo];
  return (
    `<ConsCad versao="${CONS_CAD_VERSION}" xmlns="${NFE_XMLNS}">` +
    `<infCons>` +
    `<xServ>CONS-CAD</xServ>` +
    `<UF>${input.uf}</UF>` +
    `<${tag}>${input.documento.valor}</${tag}>` +
    `</infCons>` +
    `</ConsCad>`
  );
};

export const buildConsultaCadastroSoapEnvelope = (consCadXml: string): string =>
  `<?xml version="1.0" encoding="utf-8"?>` +
  `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="${SOAP12_NS}">` +
  `<soap12:Body>` +
  `<nfeDadosMsg xmlns="${CONSULTA_CADASTRO_SOAP_NAMESPACE}">` +
  consCadXml +
  `</nfeDadosMsg>` +
  `</soap12:Body>` +
  `</soap12:Envelope>`;

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
};

const textOf = (value: unknown): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text === "" ? null : text;
  }
  const record = asRecord(value);
  return record ? textOf(record["#text"]) : null;
};

const findNode = (value: unknown, tag: string): unknown => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findNode(item, tag);
      if (found !== undefined) {
        return found;
      }
    }
    return undefined;
  }
  const record = asRecord(value);
  if (!record) {
    return undefined;
  }
  if (tag in record) {
    return record[tag];
  }
  for (const nested of Object.values(record)) {
    const found = findNode(nested, tag);
    if (found !== undefined) {
      return found;
    }
  }
  return undefined;
};

const toList = (value: unknown): unknown[] => {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
};

const mapEndereco = (value: unknown): ContribuinteEndereco | null => {
  const ender = asRecord(value);
  if (!ender) return null;
  return {
    logradouro: textOf(ender.xLgr),
    numero: textOf(ender.nro),
    complemento: textOf(ender.xCpl),
    bairro: textOf(ender.xBairro),
    codigoMunicipio: textOf(ender.cMun),
    municipio: textOf(ender.xMun),
    cep: textOf(ender.CEP),
  };
};

const mapContribuinte = (value: unknown): Contribuinte => {
  const cad = asRecord(value) ?? {};
  const situacao = textOf(cad.cSit);
  return {
    ie: textOf(cad.IE),
    cnpj: textOf(cad.CNPJ),
    cpf: textOf(cad.CPF),
    uf: textOf(cad.UF),
    situacao,
    situacaoDescricao: situacao ? (SITUACAO_DESCRICAO[situacao] ?? null) : null,
    credenciadoNfe: textOf(cad.indCredNFe),
    credenciadoCte: textOf(cad.indCredCTe),
    nome: textOf(cad.xNome),
    fantasia: textOf(cad.xFant),
    regimeApuracao: textOf(cad.xRegApur),
    cnae: textOf(cad.CNAE),
    inicioAtividade: textOf(cad.dIniAtiv),
    ultimaSituacao: textOf(cad.dUltSit),
    baixa: textOf(cad.dBaixa),
    ieUnica: textOf(cad.IEUnica),
    ieAtual: textOf(cad.IEAtual),
    endereco: mapEndereco(cad.ender),
  };
};

export const parseRetConsCad = (soapXml: string): ConsultaCadastroParsed => {
  if (!soapXml.trim()) {
    throw sefazUnavailableError("Resposta vazia da SEFAZ");
  }

  const parsed = xmlParser.parse(soapXml) as unknown;
  const fault = findNode(parsed, "Fault");
  if (fault !== undefined) {
    const reason =
      textOf(findNode(fault, "faultstring")) ??
      textOf(findNode(fault, "Text")) ??
      textOf(findNode(fault, "Reason")) ??
      "SOAP Fault na consulta cadastro da SEFAZ";
    throw sefazUnavailableError(reason);
  }

  const ret = asRecord(findNode(parsed, "retConsCad"));
  const infCons = asRecord(ret ? findNode(ret, "infCons") : undefined);
  const cStat = textOf(infCons?.cStat);
  const xMotivo = textOf(infCons?.xMotivo);
  if (!infCons || !cStat || !xMotivo) {
    throw sefazUnavailableError(
      "Nao foi possivel interpretar o retorno da consulta cadastro da SEFAZ",
    );
  }

  const encontrado = FOUND.has(cStat);
  return {
    cStat,
    xMotivo,
    uf: textOf(infCons.UF),
    dhCons: textOf(infCons.dhCons),
    encontrado,
    contribuintes: encontrado ? toList(infCons.infCad).map(mapContribuinte) : [],
  };
};
