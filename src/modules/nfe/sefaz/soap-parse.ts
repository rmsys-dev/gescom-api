import { XMLParser } from "fast-xml-parser";
import { sefazUnavailableError } from "./errors.js";

export const NFE_XMLNS = "http://www.portalfiscal.inf.br/nfe";
const SOAP12_NS = "http://www.w3.org/2003/05/soap-envelope";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
});

export const asRecord = (
  value: unknown,
): Record<string, unknown> | undefined => {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  return value as Record<string, unknown>;
};

export const textOf = (value: unknown): string | undefined => {
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

export const findNode = (value: unknown, tag: string): unknown => {
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

export const extractElementXml = (
  xml: string,
  tag: string,
): string | undefined => {
  const match = xml.match(new RegExp(`<${tag}\\b[\\s\\S]*?<\\/${tag}>`));
  return match?.[0];
};

export const stripXmlDeclaration = (xml: string): string =>
  xml.replace(/^\s*<\?xml[^?]*\?>\s*/i, "");

export const escapeXmlText = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const buildSoap12Envelope = (namespace: string, body: string): string =>
  `<?xml version="1.0" encoding="utf-8"?>` +
  `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="${SOAP12_NS}">` +
  `<soap12:Body>` +
  `<nfeDadosMsg xmlns="${namespace}">` +
  stripXmlDeclaration(body) +
  `</nfeDadosMsg>` +
  `</soap12:Body>` +
  `</soap12:Envelope>`;

/** Interpreta a resposta SOAP e converte SOAP Fault em erro de SEFAZ indisponivel. */
export const parseSoapResponse = (soapXml: string, service: string): unknown => {
  if (!soapXml.trim()) {
    throw sefazUnavailableError("Resposta vazia da SEFAZ");
  }
  const parsed = xmlParser.parse(soapXml) as unknown;
  const fault = findNode(parsed, "Fault");
  if (fault !== undefined) {
    const reason =
      textOf(findNode(fault, "faultstring")) ??
      textOf(findNode(fault, "Text")) ??
      `SOAP Fault no servico de ${service}`;
    throw sefazUnavailableError(reason);
  }
  return parsed;
};
