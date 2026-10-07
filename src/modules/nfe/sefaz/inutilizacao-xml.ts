import { sefazUnavailableError } from "./errors.js";
import {
  NFE_XMLNS,
  asRecord,
  escapeXmlText,
  extractElementXml,
  findNode,
  parseSoapResponse,
  stripXmlDeclaration,
  textOf,
} from "./soap-parse.js";

const INUT_VERSION = "4.00";

/** 102 = inutilizacao de numero homologada. */
const HOMOLOGATED = new Set(["102"]);

export type InutilizacaoInput = {
  tpAmb: 1 | 2;
  cUf: string;
  ano: string;
  cnpj: string;
  mod: "55" | "65";
  serie: number;
  nNfIni: number;
  nNfFin: number;
  xJust: string;
};

export type InutilizacaoParsed = {
  cStat: string;
  xMotivo: string;
  nProt?: string;
  dhRecbto?: string;
  retInutXml?: string;
  homologated: boolean;
};

export const inutilizacaoId = (
  input: Pick<InutilizacaoInput, "cUf" | "ano" | "cnpj" | "mod" | "serie" | "nNfIni" | "nNfFin">,
): string =>
  `ID${input.cUf}${input.ano}${input.cnpj}${input.mod}` +
  `${String(input.serie).padStart(3, "0")}` +
  `${String(input.nNfIni).padStart(9, "0")}` +
  `${String(input.nNfFin).padStart(9, "0")}`;

const tag = (name: string, value: string | number): string =>
  `<${name}>${escapeXmlText(String(value))}</${name}>`;

/** `inutNFe` ainda sem assinatura; a assinatura entra logo apos o infInut. */
export const buildInutNFeXml = (input: InutilizacaoInput): string =>
  `<inutNFe xmlns="${NFE_XMLNS}" versao="${INUT_VERSION}">` +
  `<infInut Id="${inutilizacaoId(input)}">` +
  tag("tpAmb", input.tpAmb) +
  tag("xServ", "INUTILIZAR") +
  tag("cUF", input.cUf) +
  tag("ano", input.ano) +
  tag("CNPJ", input.cnpj) +
  tag("mod", input.mod) +
  tag("serie", input.serie) +
  tag("nNFIni", input.nNfIni) +
  tag("nNFFin", input.nNfFin) +
  tag("xJust", input.xJust) +
  `</infInut>` +
  `</inutNFe>`;

export const buildProcInutNFeXml = (
  signedInutXml: string,
  retInutXml: string,
): string =>
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<ProcInutNFe xmlns="${NFE_XMLNS}" versao="${INUT_VERSION}">` +
  stripXmlDeclaration(signedInutXml) +
  retInutXml +
  `</ProcInutNFe>`;

export const parseRetInutNFe = (soapXml: string): InutilizacaoParsed => {
  const parsed = parseSoapResponse(soapXml, "inutilizacao");
  const ret = findNode(parsed, "retInutNFe");
  const infInut = asRecord(findNode(ret, "infInut"));
  const cStat = textOf(infInut?.cStat);
  const xMotivo = textOf(infInut?.xMotivo);
  if (!cStat || !xMotivo) {
    throw sefazUnavailableError(
      "Nao foi possivel interpretar o retorno da inutilizacao da SEFAZ",
    );
  }
  return {
    cStat,
    xMotivo,
    nProt: textOf(infInut?.nProt),
    dhRecbto: textOf(infInut?.dhRecbto),
    retInutXml: extractElementXml(soapXml, "retInutNFe"),
    homologated: HOMOLOGATED.has(cStat),
  };
};
