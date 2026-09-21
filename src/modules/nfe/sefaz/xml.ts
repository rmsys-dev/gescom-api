import { XMLParser } from "fast-xml-parser";
import { STATUS_SERVICO_SOAP_NAMESPACE } from "./endpoints.js";
import { sefazUnavailableError } from "./errors.js";
import type { NfeModelo, SefazAmbiente } from "./types.js";

const NFE_XMLNS = "http://www.portalfiscal.inf.br/nfe";
const SOAP12_NS = "http://www.w3.org/2003/05/soap-envelope";
const NFE_LAYOUT_VERSION = "4.00";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  trimValues: true,
});

export type StatusServicoParsed = {
  tpAmb?: string;
  verAplic?: string;
  cStat: string;
  xMotivo: string;
  cUF?: string;
  dhRecbto?: string;
  tMed?: string;
  dhRetorno?: string;
  xObs?: string;
  online: boolean;
};

export const buildConsStatServXml = (input: {
  ambiente: SefazAmbiente;
  cUF: string;
}): string =>
  `<consStatServ versao="${NFE_LAYOUT_VERSION}" xmlns="${NFE_XMLNS}">` +
  `<tpAmb>${input.ambiente}</tpAmb>` +
  `<cUF>${input.cUF}</cUF>` +
  `<xServ>STATUS</xServ>` +
  `</consStatServ>`;

export const buildStatusServicoSoapEnvelope = (consStatServXml: string): string =>
  `<?xml version="1.0" encoding="utf-8"?>` +
  `<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="${SOAP12_NS}">` +
  `<soap12:Body>` +
  `<nfeDadosMsg xmlns="${STATUS_SERVICO_SOAP_NAMESPACE}">` +
  consStatServXml +
  `</nfeDadosMsg>` +
  `</soap12:Body>` +
  `</soap12:Envelope>`;

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
  if (!record) {
    return undefined;
  }
  return textOf(record["#text"]);
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
  const match = xml.match(new RegExp(`<${tag}[\\s\\S]*?<\\/${tag}>`, "i"));
  return match?.[0];
};

export const parseRetConsStatServ = (soapXml: string): StatusServicoParsed => {
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
      "SOAP Fault na consulta a SEFAZ";
    throw sefazUnavailableError(reason);
  }

  const innerXml = extractInnerXml(soapXml, "retConsStatServ");
  const retNode = innerXml
    ? findNode(xmlParser.parse(innerXml), "retConsStatServ")
    : findNode(parsed, "retConsStatServ");
  const ret = asRecord(retNode) ?? asRecord(parsed);

  const cStat = textOf(ret?.cStat);
  const xMotivo = textOf(ret?.xMotivo);

  if (!cStat || !xMotivo) {
    throw sefazUnavailableError(
      "Nao foi possivel interpretar o retorno de status da SEFAZ",
    );
  }

  return {
    tpAmb: textOf(ret?.tpAmb),
    verAplic: textOf(ret?.verAplic),
    cStat,
    xMotivo,
    cUF: textOf(ret?.cUF),
    dhRecbto: textOf(ret?.dhRecbto),
    tMed: textOf(ret?.tMed),
    dhRetorno: textOf(ret?.dhRetorno),
    xObs: textOf(ret?.xObs),
    online: cStat === "107",
  };
};

export type StatusServicoResponse = StatusServicoParsed & {
  uf: string;
  modelo: NfeModelo;
};
