import { XMLParser } from "fast-xml-parser";
import { asRecord, findNode, textOf } from "../sefaz/soap-parse.js";
import { code128Svg } from "./barcode.js";
import {
  AUTO_PRINT_SCRIPT,
  chaveGroups,
  dateTime,
  documentOf,
  esc,
  maskedDocumentOf,
  noteNumber,
} from "./danfe-html.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
});

export type DacceEvent = {
  chave: string;
  cnpj: string;
  tpAmb: string;
  dhEvento: string;
  nSeqEvento: string;
  xCorrecao: string;
  xCondUso: string;
  nProt: string;
  dhRegEvento: string;
  cStat: string;
  xMotivo: string;
};

export type DacceNote = {
  nNf: string;
  serie: string;
  dhEmi: string;
  emitName: string;
  emitDocument: string;
  emitIe: string;
  emitAddress: string;
  destName: string;
  destDocument: string;
};

const text = (node: unknown, tag: string): string => textOf(findNode(node, tag)) ?? "";

/** Lê o `procEventoNFe` (evento assinado + retorno da SEFAZ) de uma CC-e. */
export const parseDacceXml = (xml: string): DacceEvent => {
  const parsed: unknown = parser.parse(xml);
  const evento = findNode(parsed, "evento");
  const infEvento = asRecord(findNode(evento, "infEvento"));
  if (!infEvento) {
    throw new Error("XML do evento sem o grupo infEvento.");
  }
  const tpEvento = text(infEvento, "tpEvento");
  if (tpEvento !== "110110") {
    throw new Error("O XML informado não é de uma carta de correção.");
  }
  const retInfEvento = findNode(findNode(parsed, "retEvento"), "infEvento");
  return {
    chave: text(infEvento, "chNFe"),
    cnpj: text(infEvento, "CNPJ") || text(infEvento, "CPF"),
    tpAmb: text(infEvento, "tpAmb"),
    dhEvento: text(infEvento, "dhEvento"),
    nSeqEvento: text(infEvento, "nSeqEvento"),
    xCorrecao: text(infEvento, "xCorrecao"),
    xCondUso: text(infEvento, "xCondUso"),
    nProt: text(retInfEvento, "nProt"),
    dhRegEvento: text(retInfEvento, "dhRegEvento"),
    cStat: text(retInfEvento, "cStat"),
    xMotivo: text(retInfEvento, "xMotivo"),
  };
};

const field = (label: string, value: string, width = ""): string =>
  `<td${width ? ` style="width:${width}"` : ""}><span class="label">${label}</span><strong>${esc(value)}</strong></td>`;

export const renderDacceHtml = (
  event: DacceEvent,
  note: DacceNote,
  options: { logoSrc?: string | null; autoPrint?: boolean } = {},
): string => {
  const chaveDigits = event.chave.replace(/\D/g, "");
  const barcode = code128Svg(chaveDigits);
  const watermark = event.tpAmb === "1" ? "" : "SEM VALOR FISCAL";
  const protocol = event.nProt
    ? `${event.nProt} - ${dateTime(event.dhRegEvento)}`
    : "";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>CC-e ${esc(noteNumber(note.nNf))} - Seq. ${esc(event.nSeqEvento)}</title>
<style>
  @page { size: A4 portrait; margin: 10mm 6mm 6mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 10px; }
  .sheet { position: relative; }
  table { width: 100%; border-collapse: collapse; margin-top: -1px; }
  table:first-of-type { margin-top: 0; }
  td { border: 1px solid #222; padding: 3px 4px; vertical-align: top; }
  .label { display: block; color: #222; font-size: 7.5px; line-height: 1.15; text-transform: uppercase; }
  .label.section { color: #000; font-size: 8px; font-weight: 700; }
  strong { font-weight: 700; }
  table.head { table-layout: fixed; }
  td.emit { text-align: center; width: 38%; }
  .emit-logo { display: block; max-height: 16mm; max-width: 40mm; margin: 2px auto; object-fit: contain; }
  .emit-name { font-size: 13px; font-weight: 700; text-transform: uppercase; margin-top: 6px; }
  .emit-address { margin-top: 2px; line-height: 1.25; }
  td.title { width: 18%; text-align: center; vertical-align: middle; }
  td.key { width: 44%; overflow: hidden; text-align: center; }
  td.key .label { margin-top: 5px; }
  .barcode { overflow: hidden; }
  .title-main { font-size: 20px; font-weight: 700; letter-spacing: .8px; }
  .title-sub { font-size: 8.5px; line-height: 1.2; margin-top: 2px; }
  .barcode svg { display: block; width: 86%; height: 14mm; margin: 2px auto 0; }
  .chave { display: block; margin-top: 2px; font-size: 9.5px; font-weight: 700; white-space: nowrap; text-align: center; overflow: hidden; }
  .chave span { display: inline-block; margin: 0 1.5px; }
  .correction { height: calc(30 * 1.4em + 8px); white-space: pre-wrap; font-size: 11px; line-height: 1.4; }
  .cond-uso { font-size: 10px; line-height: 1.4; text-align: justify; }
  .watermark { position: absolute; top: 45%; left: 0; right: 0; text-align: center; font-size: 56px; font-weight: 700; color: rgba(0,0,0,.08); transform: rotate(-30deg); pointer-events: none; }
</style>
</head>
<body>
<div class="sheet">
  ${watermark ? `<div class="watermark">${watermark}</div>` : ""}
  <table class="head">
    <tr>
      <td class="emit">
        <span class="label section">Identificação do emitente</span>
        ${options.logoSrc ? `<img class="emit-logo" src="${esc(options.logoSrc)}" alt="">` : ""}
        <div class="emit-name">${esc(note.emitName)}</div>
        <div class="emit-address">${esc(note.emitAddress)}</div>
      </td>
      <td class="title">
        <div class="title-main">DACCe</div>
        <div class="title-sub">Documento Auxiliar da Carta de Correção Eletrônica</div>
      </td>
      <td class="key">
        <div class="barcode">${barcode}</div>
        <span class="label">Chave de acesso da NF-e</span>
        <div class="chave">${chaveGroups(event.chave)}</div>
      </td>
    </tr>
  </table>
  <table>
    <tr>
      ${field("CNPJ / CPF do emitente", documentOf(note.emitDocument || event.cnpj), "25%")}
      ${field("Inscrição estadual", note.emitIe, "20%")}
      ${field("NF-e número / série", `${noteNumber(note.nNf)} / ${note.serie}`, "20%")}
      ${field("Data de emissão da NF-e", dateTime(note.dhEmi))}
    </tr>
  </table>
  <table>
    <tr>
      ${field("Destinatário", note.destName, "60%")}
      ${field("CNPJ / CPF do destinatário", maskedDocumentOf(note.destDocument))}
    </tr>
  </table>
  <table>
    <tr><td colspan="4"><span class="label section">Dados do evento</span></td></tr>
    <tr>
      ${field("Sequência do evento", event.nSeqEvento, "18%")}
      ${field("Data / hora do evento", dateTime(event.dhEvento), "22%")}
      ${field("Protocolo de registro", protocol, "35%")}
      ${field("Situação", event.cStat ? `${event.cStat} - ${event.xMotivo}` : "")}
    </tr>
  </table>
  <table>
    <tr><td><span class="label section">Correção</span></td></tr>
    <tr><td class="correction">${esc(event.xCorrecao)}</td></tr>
  </table>
  <table>
    <tr><td><span class="label section">Condições de uso</span></td></tr>
    <tr><td class="cond-uso">${esc(event.xCondUso)}</td></tr>
  </table>
</div>
${options.autoPrint ? AUTO_PRINT_SCRIPT : ""}
</body>
</html>`;
};
