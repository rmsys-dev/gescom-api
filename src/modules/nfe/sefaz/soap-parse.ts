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

/** Ambiente Nacional às vezes devolve o retEnvEvento escapado (`&lt;retEnvEvento`). */
export const materializeSefazXml = (xml: string): string => {
  let current = xml;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (/<(?:retEnvEvento|cStat)\b/.test(current)) return current;
    if (!current.includes("&lt;") && !current.includes("&amp;lt;")) return current;
    current = current
      .replaceAll("&amp;lt;", "&lt;")
      .replaceAll("&amp;gt;", "&gt;")
      .replaceAll("&amp;quot;", "&quot;")
      .replaceAll("&amp;apos;", "&apos;")
      .replaceAll("&lt;", "<")
      .replaceAll("&gt;", ">")
      .replaceAll("&quot;", '"')
      .replaceAll("&apos;", "'")
      .replaceAll("&amp;", "&");
  }
  return current;
};

/** Texto curto da resposta quando o XML não traz cStat/xMotivo. */
export const sefazResponseHint = (xml: string): string =>
  xml
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);

export const escapeXmlText = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const buildSoap12Document = (body: string): string =>
  `<?xml version="1.0" encoding="utf-8"?>` +
  `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="${SOAP12_NS}">` +
  `<soap12:Body>` +
  body +
  `</soap12:Body>` +
  `</soap12:Envelope>`;

export const buildSoap12Envelope = (namespace: string, body: string): string =>
  buildSoap12Document(
    `<nfeDadosMsg xmlns="${namespace}">` +
      stripXmlDeclaration(body) +
      `</nfeDadosMsg>`,
  );

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
