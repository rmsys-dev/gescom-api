import { XMLParser } from "fast-xml-parser";
import { AUTORIZACAO_SOAP_NAMESPACE } from "./endpoints.js";
import { sefazUnavailableError } from "./errors.js";

const NFE_XMLNS = "http://www.portalfiscal.inf.br/nfe";
const SOAP12_NS = "http://www.w3.org/2003/05/soap-envelope";
const NFE_LAYOUT_VERSION = "4.00";

const AUTHORIZED = new Set(["100", "150"]);
const DENIED = new Set(["110", "301", "302", "303"]);

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
});

export type AutorizacaoParsed = {
  cStat: string;
  xMotivo: string;
  nProt?: string;
  dhRecbto?: string;
  digVal?: string;
  chNFe?: string;
  protNFeXml?: string;
  authorized: boolean;
  denied: boolean;
};

const asRecord = (value: unknown): Record<string, unknown> | undefined => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
};

const textOf = (value: unknown): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value === "string" || typeof value === "number") {
    const text = String(value).trim();
    return text === "" ? undefined : text;
  }
  const record = asRecord(value);
  return record ? textOf(record["#text"]) : undefined;
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

const extractInnerXml = (xml: string, tag: string): string | undefined => {
  const match = xml.match(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`));
  return match?.[0];
};

/** Lote sincrono de uma NF-e ja assinada. */
export const buildEnviNFeXml = (
  signedNfeXml: string,
  idLote: string,
): string => {
  const nfe = signedNfeXml.replace(/^\s*<\?xml[^?]*\?>\s*/i, "");
  const lote = idLote.replace(/\D/g, "").slice(0, 15) || "1";
  return (
    `<enviNFe xmlns="${NFE_XMLNS}" versao="${NFE_LAYOUT_VERSION}">` +
    `<idLote>${lote}</idLote>` +
    `<indSinc>1</indSinc>` +
    nfe +
    `</enviNFe>`
  );
};

export const buildAutorizacaoSoapEnvelope = (enviNFeXml: string): string =>
  `<?xml version="1.0" encoding="utf-8"?>` +
  `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="${SOAP12_NS}">` +
  `<soap12:Body>` +
  `<nfeDadosMsg xmlns="${AUTORIZACAO_SOAP_NAMESPACE}">` +
  enviNFeXml +
  `</nfeDadosMsg>` +
  `</soap12:Body>` +
  `</soap12:Envelope>`;

export const buildProcNFeXml = (
  signedNfeXml: string,
  protNFeXml: string,
): string => {
  const nfe = signedNfeXml.replace(/^\s*<\?xml[^?]*\?>\s*/i, "");
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<nfeProc xmlns="${NFE_XMLNS}" versao="${NFE_LAYOUT_VERSION}">` +
    nfe +
    protNFeXml +
    `</nfeProc>`
  );
};

export const parseRetEnviNFe = (soapXml: string): AutorizacaoParsed => {
  if (!soapXml.trim()) {
    throw sefazUnavailableError("Resposta vazia da SEFAZ");
  }
  const parsed = xmlParser.parse(soapXml) as unknown;
  const fault = findNode(parsed, "Fault");
  if (fault !== undefined) {
    const reason =
      textOf(findNode(fault, "faultstring")) ??
      textOf(findNode(fault, "Text")) ??
      "SOAP Fault na autorizacao da NF-e";
    throw sefazUnavailableError(reason);
  }

  const protNFeXml = extractInnerXml(soapXml, "protNFe");
  const infProt = asRecord(findNode(parsed, "infProt"));
  const ret = asRecord(findNode(parsed, "retEnviNFe"));
  const cStat = textOf(infProt?.cStat) ?? textOf(ret?.cStat);
  const xMotivo = textOf(infProt?.xMotivo) ?? textOf(ret?.xMotivo);
  if (!cStat || !xMotivo) {
    throw sefazUnavailableError(
      "Nao foi possivel interpretar o retorno de autorizacao da SEFAZ",
    );
  }
  const nProt =
    textOf(infProt?.nProt) ??
    (cStat === "204" ? xMotivo.match(/\[nProt:(\d+)\]/)?.[1] : undefined);
  const dhRecbto =
    textOf(infProt?.dhRecbto) ??
    (cStat === "204"
      ? xMotivo.match(/\[dhRecbto:([^\]]+)\]/)?.[1]
      : undefined);

  return {
    cStat,
    xMotivo,
    nProt,
    dhRecbto,
    digVal: textOf(infProt?.digVal),
    chNFe: textOf(infProt?.chNFe),
    protNFeXml,
    authorized: AUTHORIZED.has(cStat) || (cStat === "204" && Boolean(nProt)),
    denied: DENIED.has(cStat),
  };
};
