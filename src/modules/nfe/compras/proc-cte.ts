import { XMLParser } from "fast-xml-parser";
import { isValidNfeAccessKey } from "../sefaz/access-key.js";
import { asRecord, findNode, textOf } from "../sefaz/soap-parse.js";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
});

export type ProcCTeCompra = {
  chave: string;
  number: string;
  serie: string;
  emitCnpj: string;
  emitName: string | null;
  freightValue: string | null;
  icmsRate: string | null;
  icmsValue: string | null;
  dhEmi: Date;
  nfeChaves: string[];
};

const digits = (value: string | undefined): string => (value ?? "").replace(/\D/g, "");

const clip = (value: string | undefined, max: number): string | null => {
  const text = value?.trim();
  if (!text) return null;
  return text.slice(0, max);
};

const money = (value: string | undefined): string | null => {
  const text = value?.trim();
  if (!text || !/^\d+(\.\d{1,10})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  return `${whole}.${fraction.padEnd(2, "0").slice(0, 2)}`;
};

const rate = (value: string | undefined): string | null => {
  const text = value?.trim();
  if (!text || !/^\d+(\.\d{1,10})?$/.test(text)) return null;
  return text;
};

const collect = (value: unknown, tag: string, out: unknown[]): void => {
  if (Array.isArray(value)) {
    for (const item of value) collect(item, tag, out);
    return;
  }
  const record = asRecord(value);
  if (!record) return;
  if (tag in record) {
    const node = record[tag];
    if (Array.isArray(node)) out.push(...node);
    else if (node !== undefined && node !== null) out.push(node);
  }
  for (const nested of Object.values(record)) collect(nested, tag, out);
};

export const classifyCteDocument = (
  schema: string | undefined,
  xml: string,
): "proc" | "evento" | "outro" => {
  const name = (schema ?? "").toLowerCase();
  if (name.startsWith("proccte") || xml.includes("<cteProc")) return "proc";
  if (name.includes("evento") || xml.includes("<procEventoCTe") || xml.includes("<eventoCTe")) {
    return "evento";
  }
  return "outro";
};

/** Lê um cteProc. Devolve null quando o XML não é um CT-e modelo 57 utilizável. */
export const parseProcCTe = (xml: string): ProcCTeCompra | null => {
  if (!xml.includes("<cteProc") && !xml.includes("<infCte")) return null;
  const parsed = xmlParser.parse(xml);
  const infCte = asRecord(findNode(parsed, "infCte"));
  const id = textOf(infCte?.["@_Id"]) ?? "";
  const chave = id.replace(/^CTe/, "").replace(/\D/g, "");
  if (!isValidNfeAccessKey(chave) || chave.slice(20, 22) !== "57") return null;
  const ide = asRecord(findNode(infCte, "ide"));
  const emit = asRecord(findNode(infCte, "emit"));
  const emitCnpj = digits(textOf(emit?.CNPJ));
  if (emitCnpj.length !== 14) return null;
  const emitted = new Date(textOf(ide?.dhEmi) ?? "");
  const year = Number(`20${chave.slice(2, 4)}`);
  const month = Number(chave.slice(4, 6));
  const dhEmi = Number.isNaN(emitted.getTime())
    ? new Date(Date.UTC(year, Math.max(0, month - 1), 1, 15))
    : emitted;
  const number = (digits(textOf(ide?.nCT)) || chave.slice(25, 34)).slice(0, 9);
  const serie = (textOf(ide?.serie)?.replace(/\D/g, "") || chave.slice(22, 25)).slice(0, 3);
  if (!number || !serie) return null;
  const icms = findNode(infCte, "ICMS");
  const notas: unknown[] = [];
  collect(infCte, "infNFe", notas);
  const nfeChaves = [
    ...new Set(
      notas.flatMap((node) => {
        const chaveNfe = digits(textOf(asRecord(node)?.chave));
        return isValidNfeAccessKey(chaveNfe) && chaveNfe.slice(20, 22) === "55" ? [chaveNfe] : [];
      }),
    ),
  ];
  return {
    chave,
    number,
    serie,
    emitCnpj,
    emitName: clip(textOf(emit?.xNome), 60),
    freightValue: money(textOf(findNode(infCte, "vTPrest"))),
    icmsRate: rate(textOf(findNode(icms, "pICMS"))),
    icmsValue: money(textOf(findNode(icms, "vICMS"))),
    dhEmi,
    nfeChaves,
  };
};
