import { XMLParser } from "fast-xml-parser";
import { BadRequestError } from "../../../shared/errors/app-error.js";
import { isValidNfeAccessKey } from "../sefaz/access-key.js";
import { asRecord, findNode, textOf } from "../sefaz/soap-parse.js";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
});

export type ProcNFeCompra = {
  chave: string;
  cUf: string;
  cNf: string;
  serie: string;
  nNf: number;
  tpEmis: number;
  tpAmb: 1 | 2;
  cMunFg: number;
  dhEmi: Date;
  emitCnpj: string;
  emitCpf: string | null;
  emitXNome: string | null;
  destCnpj: string;
  destCpf: string | null;
  nProt: string | null;
  cStat: string | null;
  xMotivo: string | null;
  dhRecbto: Date | null;
  digVal: string | null;
  vNf: string | null;
};

const digits = (value: string | undefined): string =>
  (value ?? "").replace(/\D/g, "");

const clip = (value: string | undefined, max: number): string | null => {
  const text = value?.trim();
  if (!text) return null;
  return text.slice(0, max);
};

const chaveFromXml = (infNFe: Record<string, unknown> | undefined): string => {
  const id = textOf(infNFe?.["@_Id"]) ?? "";
  const fromId = id.replace(/^NFe/, "").replace(/\D/g, "");
  const fromProt = digits(textOf(findNode(infNFe, "chNFe")));
  return fromId.length === 44 ? fromId : fromProt;
};

const money = (value: string | undefined): string | null => {
  const text = value?.trim();
  if (!text || !/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return `${whole}.${fraction.padEnd(2, "0")}`;
};

/** Lê um nfeProc de compra. Resumo (resNFe) e evento não passam. */
export const parseProcNFeCompra = (xml: string): ProcNFeCompra => {
  if (!xml.includes("<nfeProc") || !xml.includes("<protNFe")) {
    throw new BadRequestError(
      "O XML precisa ser o procNFe da nota, com protocolo",
      "NFE_COMPRA_XML_INVALID",
    );
  }
  const parsed = asRecord(findNode(xmlParser.parse(xml), "nfeProc"));
  const infNFe = asRecord(findNode(parsed, "infNFe"));
  const ide = asRecord(findNode(infNFe, "ide"));
  const emit = asRecord(findNode(infNFe, "emit"));
  const dest = asRecord(findNode(infNFe, "dest"));
  const prot = asRecord(findNode(parsed, "infProt"));
  const chave = chaveFromXml(infNFe) || digits(textOf(prot?.chNFe));
  if (!isValidNfeAccessKey(chave) || chave.slice(20, 22) !== "55") {
    throw new BadRequestError(
      "O procNFe precisa ser de NF-e modelo 55 com chave valida",
      "NFE_COMPRA_XML_INVALID",
    );
  }
  const issuerKey = chave.slice(6, 20);
  const emitCnpj = digits(textOf(emit?.CNPJ));
  const emitCpf = digits(textOf(emit?.CPF));
  const emitOk =
    (emitCnpj.length === 14 && emitCnpj === issuerKey) ||
    (emitCpf.length === 11 && emitCpf.padStart(14, "0") === issuerKey);
  const destCnpj = digits(textOf(dest?.CNPJ));
  const destCpf = digits(textOf(dest?.CPF));
  if (!emitOk || (destCnpj.length !== 14 && destCpf.length !== 11)) {
    throw new BadRequestError(
      "O procNFe precisa do CNPJ ou do CPF do emitente e do destinatario",
      "NFE_COMPRA_XML_INVALID",
    );
  }
  const dhEmi = new Date(textOf(ide?.dhEmi) ?? "");
  if (Number.isNaN(dhEmi.getTime())) {
    throw new BadRequestError(
      "Data de emissao ausente no procNFe",
      "NFE_COMPRA_XML_INVALID",
    );
  }
  const cMunFg = Number(digits(textOf(ide?.cMunFG)));
  const tpAmb = Number(textOf(ide?.tpAmb));
  const tpEmis = Number(chave.slice(34, 35));
  const nNf = Number(chave.slice(25, 34));
  if (
    !Number.isInteger(cMunFg) ||
    cMunFg <= 0 ||
    (tpAmb !== 1 && tpAmb !== 2) ||
    ![1, 2, 4, 5, 6, 7, 9].includes(tpEmis) ||
    nNf < 1
  ) {
    throw new BadRequestError(
      "Identificacao do procNFe incompleta",
      "NFE_COMPRA_XML_INVALID",
    );
  }
  const received = textOf(prot?.dhRecbto);
  const dhRecbto = received ? new Date(received) : null;
  return {
    chave,
    cUf: chave.slice(0, 2),
    cNf: chave.slice(35, 43),
    serie: chave.slice(22, 25),
    nNf,
    tpEmis,
    tpAmb,
    cMunFg,
    dhEmi,
    emitCnpj: emitCnpj.length === 14 ? emitCnpj : "",
    emitCpf: emitCpf.length === 11 ? emitCpf : null,
    emitXNome: clip(textOf(emit?.xNome), 60),
    destCnpj: destCnpj.length === 14 ? destCnpj : "",
    destCpf: destCpf.length === 11 ? destCpf : null,
    nProt: clip(textOf(prot?.nProt), 15),
    cStat: clip(textOf(prot?.cStat), 3),
    xMotivo: clip(textOf(prot?.xMotivo), 255),
    dhRecbto:
      dhRecbto && !Number.isNaN(dhRecbto.getTime()) ? dhRecbto : null,
    digVal: clip(textOf(prot?.digVal), 28),
    vNf: money(textOf(asRecord(findNode(infNFe, "ICMSTot"))?.vNF)),
  };
};

export const classifyDfeDocument = (
  schema: string | undefined,
  xml: string,
): "proc" | "resumo" | "evento" | "outro" => {
  const name = (schema ?? "").toLowerCase();
  if (name.startsWith("procnfe") || xml.includes("<nfeProc")) return "proc";
  if (name.startsWith("resnfe") || xml.includes("<resNFe")) return "resumo";
  if (name.includes("evento") || xml.includes("<procEventoNFe") || xml.includes("<resEvento")) {
    return "evento";
  }
  return "outro";
};
