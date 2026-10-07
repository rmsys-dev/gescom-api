import { code128Svg, qrCodeSvg } from "./barcode.js";

const PORTAL_CONSULTA =
  "https://www.nfe.fazenda.gov.br/portal/consultaRecaptcha.aspx?tipoConsulta=resumo&tipoConteudo=7PhJ+gAVw2g=&nfe=";
import type { DanfeItem, DanfeModel, DanfeParty, DanfePayment } from "./parse-xml.js";

const FREIGHT: Record<string, string> = {
  "0": "0-Emitente (CIF)",
  "1": "1-Destinatário (FOB)",
  "2": "2-Terceiros",
  "3": "3-Próprio Remetente",
  "4": "4-Próprio Destinatário",
  "9": "9-Sem Transp.",
};

export const PAYMENT: Record<string, string> = {
  "01": "Dinheiro",
  "02": "Cheque",
  "03": "Cartão de Crédito",
  "04": "Cartão de Débito",
  "05": "Crédito Loja",
  "10": "Vale Alimentação",
  "11": "Vale Refeição",
  "12": "Vale Presente",
  "13": "Vale Combustível",
  "15": "Boleto Bancário",
  "16": "Depósito Bancário",
  "17": "Pagamento Instantâneo (PIX)",
  "18": "Transferência bancária",
  "90": "Sem pagamento",
  "99": "Outros",
};

export const esc = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

export const money = (value: string): string => {
  if (!value) return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return esc(value);
  return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const moneyOrZero = (value: string): string => money(value || "0");

export const qty = (value: string): string => {
  if (!value) return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return esc(value);
  return amount.toLocaleString("pt-BR", { maximumFractionDigits: 4 });
};

const rate = (value: string): string => {
  if (!value) return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return esc(value);
  return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const dateParts = (value: string) => {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (!match) return null;
  return {
    date: `${match[3]}/${match[2]}/${match[1]}`,
    time: match[4] ? `${match[4]}:${match[5]}${match[6] ? `:${match[6]}` : ""}` : "",
  };
};

const dateOnly = (value: string): string => dateParts(value)?.date ?? esc(value);
const timeOnly = (value: string): string => dateParts(value)?.time ?? "";
export const dateTime = (value: string): string => {
  const parts = dateParts(value);
  if (!parts) return esc(value);
  return parts.time ? `${parts.date} ${parts.time}` : parts.date;
};

export const documentOf = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return value;
};

/** CPF de pessoa física sai parcialmente oculto (LGPD): ***.456.789-**. CNPJ segue completo. */
export const maskedDocumentOf = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) return `***.${digits.slice(3, 6)}.${digits.slice(6, 9)}-**`;
  return documentOf(value);
};

export const cepOf = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return value;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
};

const phoneOf = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 13 && digits.startsWith("55")) {
    return `55 (${digits.slice(2, 4)}) ${digits.slice(4, 9)}-${digits.slice(9)}`;
  }
  if (digits.length === 12 && digits.startsWith("55")) {
    return `55 (${digits.slice(2, 4)}) ${digits.slice(4, 8)}-${digits.slice(8)}`;
  }
  if (digits.length === 11) return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return value;
};

export const chaveGroups = (value: string): string =>
  (value.replace(/\D/g, "").match(/.{1,4}/g) ?? [])
    .map((group) => `<span>${esc(group)}</span>`)
    .join("");

export const noteNumber = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return value;
  return Number(digits).toLocaleString("pt-BR");
};

const field = (label: string, value: string, width = "", className = ""): string =>
  `<td${className ? ` class="${className}"` : ""}${width ? ` style="width:${width}"` : ""}><span class="label">${label}</span><strong>${esc(value)}</strong></td>`;

const CRT: Record<string, string> = {
  "1": "1 - Simples Nacional",
  "2": "2 - Simples Nacional, excesso de sublimite",
  "3": "3 - Regime Normal",
  "4": "4 - MEI",
};

const filled = (value: string): boolean => Boolean(value) && Number(value) !== 0;

/** Quadro de totais em grade; a última célula de cada linha ocupa as colunas que sobrarem. */
const totalsGrid = (title: string, cells: Array<[string, string]>, perRow = 5): string => {
  const rows: string[] = [];
  for (let start = 0; start < cells.length; start += perRow) {
    const slice = cells.slice(start, start + perRow);
    rows.push(
      `<tr>${slice
        .map(([label, value], index) => {
          const span = index === slice.length - 1 ? perRow - slice.length + 1 : 1;
          return `<td class="total"${span > 1 ? ` colspan="${span}"` : ""}><div class="total-cell"><span class="label">${label}</span><strong>${value}</strong></div></td>`;
        })
        .join("")}</tr>`,
    );
  }
  return `<table class="block tax"><colgroup>${"<col>".repeat(perRow)}</colgroup><tr><td colspan="${perRow}"><span class="label section">${title}</span></td></tr>${rows.join("")}</table>`;
};

const streetLine = (party: DanfeParty): string =>
  [party.street, party.number].filter(Boolean).join(", ") +
  (party.complement ? ` - ${party.complement}` : "");

const emitAddress = (party: DanfeParty): string => {
  const first = [streetLine(party), party.neighborhood].filter(Boolean).join(" - ");
  const city = [party.city, party.uf].filter(Boolean).join(" - ");
  const second = [party.cep ? cepOf(party.cep) : "", city].filter(Boolean).join(" ");
  return [first, second, phoneOf(party.phone)].filter(Boolean).map((line) => esc(line)).join("<br>");
};

const cstOf = (orig: string, cst: string): string => {
  if (!orig) return cst;
  return `${orig}${cst}`;
};

const hasInvoice = (model: DanfeModel): boolean =>
  Boolean(model.invoiceNumber || model.invoiceOriginal || model.duplicates.length);

const itemTitle = (item: DanfeItem): string => (item.cProd ? `${item.cProd} - ${item.xProd}` : item.xProd);

/** Altura do item em linhas de texto: alíquotas e valores ocupam 6 linhas, a descrição pode passar disso. */
const itemWeight = (item: DanfeItem): number => {
  const description =
    Math.ceil((itemTitle(item).length + 4) / 55) +
    (item.infAdProd ? Math.ceil(item.infAdProd.length / 65) : 0) +
    1;
  return Math.max(6, description);
};

const LINES_FIRST_ONLY = 30;
const LINES_FIRST = 48;
const LINES_LAST = 72;
const LINES_MIDDLE = 90;

const paginateItems = (items: DanfeItem[]): DanfeItem[][] => {
  if (items.length === 0) return [[]];
  const pages: DanfeItem[][] = [];
  let index = 0;
  let first = true;
  while (index < items.length) {
    let ahead = 0;
    for (let cursor = index; cursor < items.length; cursor += 1) ahead += itemWeight(items[cursor]);
    const closing = first ? LINES_FIRST_ONLY : LINES_LAST;
    let cap = ahead <= closing ? closing : (first ? LINES_FIRST : LINES_MIDDLE);
    if (ahead > closing && ahead <= cap) cap = Math.max(1, ahead - itemWeight(items[items.length - 1]));
    const page: DanfeItem[] = [];
    let used = 0;
    while (index < items.length) {
      const weight = itemWeight(items[index]);
      if (page.length > 0 && used + weight > cap) break;
      page.push(items[index]);
      used += weight;
      index += 1;
      if (used >= cap) break;
    }
    pages.push(page);
    first = false;
  }
  return pages;
};

const percentOrZero = (value: string): string => `${rate(value || "0")}%`;
const taxLine = (label: string, value: string): string =>
  `<div class="tax-line"><span class="tax-name">${label}</span><span class="tax-value">${value}</span></div>`;

const itemRow = (item: DanfeItem): string => {
  const codes = [item.ncm ? `[NCM ${item.ncm}]` : "", item.cClassTrib ? `[cClassTrib ${item.cClassTrib}]` : ""]
    .filter(Boolean)
    .join(" ");
  return (
    `<tr>` +
    `<td class="desc"><strong>${esc(itemTitle(item))}</strong>` +
    (item.infAdProd ? `<span class="item-extra">${esc(item.infAdProd)}</span>` : "") +
    (codes ? `<span class="item-codes">${esc(codes)}</span>` : "") +
    `</td>` +
    `<td class="cst">${taxLine("CST", esc(cstOf(item.orig, item.cst)) || "—")}${taxLine("CFOP", esc(item.cfop) || "—")}</td>` +
    `<td class="num">${qty(item.qCom)}<br>${esc(item.uCom)}</td>` +
    `<td class="num">${money(item.vUnCom)}</td>` +
    `<td class="num">${money(item.vProd)}</td>` +
    `<td class="taxes">` +
    taxLine("ICMS", moneyOrZero(item.vBc)) +
    taxLine("IBS/CBS", moneyOrZero(item.vBcIbsCbs)) +
    taxLine("IS", moneyOrZero(item.vBcIs)) +
    taxLine("IPI", moneyOrZero(item.vBcIpi)) +
    `</td>` +
    `<td class="taxes">` +
    taxLine("ICMS", percentOrZero(item.pIcms)) +
    taxLine("IBS UF", percentOrZero(item.pIbsUf)) +
    taxLine("IBS MUN", percentOrZero(item.pIbsMun)) +
    taxLine("CBS", percentOrZero(item.pCbs)) +
    taxLine("IS", percentOrZero(item.pIs)) +
    taxLine("IPI", percentOrZero(item.pIpi)) +
    `</td>` +
    `<td class="taxes">` +
    taxLine("ICMS", moneyOrZero(item.vIcms)) +
    taxLine("IBS UF", moneyOrZero(item.vIbsUf)) +
    taxLine("IBS MUN", moneyOrZero(item.vIbsMun)) +
    taxLine("CBS", moneyOrZero(item.vCbs)) +
    taxLine("IS", moneyOrZero(item.vIs)) +
    taxLine("IPI", moneyOrZero(item.vIpi)) +
    `</td>` +
    `</tr>`
  );
};

/** Imprime ao terminar de carregar; funciona também em iframe com srcdoc. */
export const AUTO_PRINT_SCRIPT =
  `<script>window.addEventListener("load", function () { window.print(); });</script>`;

export const renderDanfeHtml = (
  model: DanfeModel,
  options: { logoSrc?: string | null; cancelled?: boolean; autoPrint?: boolean } = {},
): string => {
  const watermark = options.cancelled
    ? "CANCELADA"
    : !model.authorized || model.tpAmb !== "1"
      ? "SEM VALOR FISCAL"
      : "";
  const operation = model.tpNf === "0" ? "0" : "1";
  const number = noteNumber(model.nNf);
  const chaveDigits = model.chave.replace(/\D/g, "");
  const barcode = code128Svg(chaveDigits);
  const qrContent = model.qrCode || (chaveDigits.length === 44 ? `${PORTAL_CONSULTA}${chaveDigits}` : "");
  const qrCode = qrCodeSvg(qrContent);
  const pages = paginateItems(model.items);
  const duplicates = model.duplicates
    .map((row) => `<span class="dup">Dup. ${esc(row.nDup)} · Venc. ${dateOnly(row.dVenc)} · ${money(row.vDup)}</span>`)
    .join("");
  const volume = model.volumes[0];
  const t = model.totals;
  const optional = (entries: Array<[string, string, (value: string) => string]>): Array<[string, string]> =>
    entries.filter(([, value]) => filled(value)).map(([label, value, format]) => [label, format(value)]);
  const noteCells: Array<[string, string]> = [
    ["Valor total dos produtos", moneyOrZero(t.vProd)],
    ["Valor do frete", moneyOrZero(t.vFrete)],
    ["Valor do seguro", moneyOrZero(t.vSeg)],
    ["Desconto", moneyOrZero(t.vDesc)],
    ["Outras despesas", moneyOrZero(t.vOutro)],
    ...optional([["Valor aprox. dos tributos", t.vTotTrib, money]]),
    ["Valor total da nota", moneyOrZero(t.vNf)],
  ];
  const noteTotals = totalsGrid("Total dos produtos e total da nota", noteCells, noteCells.length);
  const icmsTotals = totalsGrid("Total do ICMS / IPI", [
    ["Base de cálculo do ICMS", moneyOrZero(t.vBc)],
    ["Valor do ICMS", moneyOrZero(t.vIcms)],
    ["Base de cálculo do ICMS ST", moneyOrZero(t.vBcSt)],
    ["Valor do ICMS ST", moneyOrZero(t.vSt)],
    ["Valor do IPI", moneyOrZero(t.vIpi)],
    ...optional([
      ["Valor do FCP", t.vFcp, money],
      ["Valor do FCP retido por ST", t.vFcpSt, money],
      ["Valor do DIFAL na UF de destino", t.vIcmsUfDest, money],
      ["Valor do FCP na UF de destino", t.vFcpUfDest, money],
      ["BC do ICMS monofásico", t.qBcMono, qty],
      ["Valor do ICMS monofásico", t.vIcmsMono, money],
      ["BC do ICMS monofásico por retenção", t.qBcMonoReten, qty],
      ["Valor do ICMS monofásico por retenção", t.vIcmsMonoReten, money],
    ]),
  ]);
  const reformTotals = totalsGrid("Total do IBS / CBS / IS", [
    ["Valor da CBS", moneyOrZero(t.vCbs)],
    ["Valor do IBS UF", moneyOrZero(t.vIbsUf)],
    ["Valor do IBS Município", moneyOrZero(t.vIbsMun)],
    ["Valor do Imposto Seletivo", moneyOrZero(t.vIs)],
    ...(t.mono
      ? ([
          ["Valor do IBS monofásico", moneyOrZero(t.mono.vIbsMono)],
          ["Valor da CBS monofásica", moneyOrZero(t.mono.vCbsMono)],
          ...optional([
            ["Valor do IBS monofásico por retenção", t.mono.vIbsMonoReten, money],
            ["Valor da CBS monofásica por retenção", t.mono.vCbsMonoReten, money],
          ]),
        ] as Array<[string, string]>)
      : []),
  ], 4);
  const issqnTotals = t.issqn
    ? totalsGrid("Cálculo do ISSQN", [
        ["Inscrição municipal", esc(model.emit.im) || "—"],
        ["Valor total dos serviços", moneyOrZero(t.issqn.vServ)],
        ["Base de cálculo do ISSQN", moneyOrZero(t.issqn.vBc)],
        ["Valor do ISSQN", moneyOrZero(t.issqn.vIss)],
      ], 4)
    : "";
  const additional = [model.infAdFisco, model.infCpl]
    .filter(Boolean)
    .map((line) => esc(line))
    .join("<br>");
  const dest = model.dest;
  const destPlace = dest
    ? [streetLine(dest), dest.neighborhood, dest.cep ? cepOf(dest.cep) : "", dest.city, dest.uf]
        .filter(Boolean)
        .join(", ")
    : "";
  const paymentName = (row: DanfePayment) => row.xPag || PAYMENT[row.tPag] || row.tPag;
  const paymentList = model.payments
    .map((row) => `${paymentName(row)}${row.indPag === "1" ? " (a prazo)" : ""} ${money(row.vPag)}`)
    .join(" · ");
  const invoice = hasInvoice(model)
    ? `<table>
        <tr><td colspan="3"><span class="label section">FATURA / DUPLICATA</span></td></tr>
        <tr>
          ${field("NÚMERO", model.invoiceNumber, "16%")}
          ${field("FORMAS DE PAGAMENTO", paymentList)}
          ${field("VALOR DA FATURA", money(model.invoiceNet || model.invoiceOriginal), "16%", "num")}
        </tr>
        ${duplicates ? `<tr><td colspan="3">${duplicates}</td></tr>` : ""}
      </table>`
    : paymentList
      ? `<table>
          <tr><td><span class="label section">PAGAMENTO</span></td></tr>
          <tr>${field("FORMAS DE PAGAMENTO", paymentList)}</tr>
        </table>`
      : "";

  const totalPages = pages.length;
  const head = (current: number) => `<table>
    <tr>
      <td class="emit" style="width:${qrCode ? "35%" : "42%"}">
        <span class="label section">Identificação do emitente</span>
        ${options.logoSrc ? `<img class="emit-logo" src="${esc(options.logoSrc)}" alt="">` : ""}
        <div class="emit-name">${esc(model.emit.name)}</div>
        ${model.emit.fantasy ? `<div>${esc(model.emit.fantasy)}</div>` : ""}
        <div class="emit-address">${emitAddress(model.emit)}</div>
      </td>
      <td class="danfe-box"><div class="head-fill">
        <div class="danfe-title">DANFE</div>
        <div class="danfe-sub">Documento Auxiliar da Nota Fiscal Eletrônica</div>
        <div class="entry">0-ENTRADA<br>1-SAÍDA <b>${operation}</b></div>
        <div class="nf-num">Nº ${esc(number)}</div>
        <div>SÉRIE ${esc(model.serie)}</div>
        <div>FOLHA ${current}/${totalPages}</div>
      </div></td>
      <td class="access"><div class="head-fill">
        <div class="barcode">${barcode}</div>
        <div class="chave-box"><span class="label">Chave de acesso</span>
        <span class="chave">${chaveGroups(model.chave)}</span></div>
        <div class="consult">
          <span class="consult-title">Consulta de autenticidade no portal nacional da NF-e</span>
          <span class="consult-url">www.nfe.fazenda.gov.br/portal</span>
          <span>ou no site da Sefaz Autorizadora</span>
        </div>
      </div></td>
      ${qrCode ? `<td class="qrcode">${qrCode}<div class="qrcode-text">Consulta via leitor de QR Code</div></td>` : ""}
    </tr>
  </table>`;
  const products = (group: DanfeItem[]) => {
    const rows = group.map(itemRow).join("") || `<tr><td colspan="8">&nbsp;</td></tr>`;
    return `<div class="items-wrap">
      <table class="items">
        <colgroup>
          <col>
          <col style="width:13mm">
          <col style="width:13mm">
          <col style="width:15mm">
          <col style="width:16mm">
          <col style="width:24mm">
          <col style="width:22mm">
          <col style="width:24mm">
        </colgroup>
        <thead>
          <tr><th colspan="8">DADOS DOS PRODUTOS / SERVIÇOS</th></tr>
          <tr>
            <th>DESCRIÇÃO DO PRODUTO / SERVIÇO</th><th>CST / CFOP</th><th>QTD / UN</th><th>VLR UNIT</th><th>VLR TOTAL</th>
            <th>BASES DE CÁLCULO</th><th>ALÍQUOTAS</th><th>VALOR DOS TRIBUTOS</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="pad">${"<td></td>".repeat(8)}</tr>
        </tbody>
      </table>
    </div>`;
  };

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<title>DANFE ${esc(number)}</title>
<style>
  /* 6 mm cobre a área não imprimível das lasers (HP ~4,2 mm); com a folha de 284 mm, sobra 1 mm. */
  @page { size: A4 portrait; margin: 6mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 10px; }
  .sheet { height: 284mm; display: flex; flex-direction: column; break-after: page; overflow: hidden; }
  .sheet:last-child { break-after: auto; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #222; padding: 2px 3px; vertical-align: top; }
  .label { display: block; color: #222; font-size: 7.5px; font-weight: 400; line-height: 1.15; text-transform: uppercase; }
  .label.section { color: #000; font-size: 8px; font-weight: 700; }
  strong { font-weight: 700; }
  .items td.num { text-align: right; white-space: nowrap; padding-right: 5px; }
  td.num strong,
  table.tax strong {
    display: block;
    text-align: right;
    padding-right: 5px;
  }
  .center { text-align: center; }
  td.mid strong { display: block; text-align: center; }
  table.dest { table-layout: fixed; }
  table.dest td.side,
  table.dest td.doc { white-space: nowrap; }
  table.tax { table-layout: fixed; }
  table.tax + table.tax { margin-top: -1px; }
  table.tax td.total { height: 1px; }
  table.tax .total-cell { display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
  table.carrier { table-layout: fixed; width: 100%; margin-top: -1px; }
  table.carrier.lead { margin-top: 2px; }
  table.carrier td { overflow-wrap: anywhere; }
  td.emit { text-align: center; }
  td.emit .label { text-align: center; }
  td.emit .label + .emit-name { margin-top: 8px; }
  .emit-logo { display: block; max-height: 16mm; max-width: 40mm; margin: 2px auto; object-fit: contain; }
  .emit-name { font-size: 13px; font-weight: 700; line-height: 1.15; text-transform: uppercase; }
  .emit-address { margin-top: 2px; line-height: 1.25; }
  .danfe-box { width: 108px; text-align: center; }
  td.danfe-box, td.access { height: 1px; }
  .head-fill { display: flex; flex-direction: column; justify-content: space-between; height: 100%; }
  .danfe-title { font-size: 21px; font-weight: 700; letter-spacing: .8px; line-height: 1; }
  .danfe-sub { font-size: 8.5px; line-height: 1.15; }
  .entry { font-size: 10px; line-height: 1.25; }
  .entry b { display: inline-block; border: 1px solid #222; min-width: 13px; margin-left: 4px; padding: 0 2px; font-size: 11px; }
  .nf-num { font-size: 12px; font-weight: 700; }
  .danfe-box .head-fill > div:not([class]) { font-size: 10.5px; font-weight: 700; }
  .barcode { overflow: hidden; }
  .barcode svg { display: block; width: 86%; height: 34px; margin: 2px auto 0; }
  td.qrcode { width: 25mm; padding: 2px 3px; vertical-align: top; }
  td.qrcode svg { display: block; width: 23mm; height: 23mm; margin: 2px auto 0; }
  .qrcode-text { margin: 4px -3px 0; padding: 3px 3px 0; border-top: 1px solid #222; font-size: 8.5px; font-weight: 700; line-height: 1.3; text-align: center; text-transform: uppercase; }
  .access { text-align: center; }
  td.access .head-fill { justify-content: flex-start; }
  .chave-box { margin: 5px -3px 0; padding: 2px 3px 3px; border-top: 1px solid #222; border-bottom: 1px solid #222; }
  .access .label { text-align: center; font-size: 8.5px; }
  .chave { display: block; margin-top: 2px; font-size: 11px; font-weight: 700; white-space: nowrap; text-align: center; }
  .chave span { display: inline-block; margin: 0 1.5px; }
  .consult { margin-top: 4px; font-size: 9px; font-weight: 700; line-height: 1.3; text-align: center; }
  .consult span { display: block; }
  .consult .consult-title { font-size: 10px; white-space: nowrap; }
  .consult .consult-url { text-decoration: underline; }
  .items-wrap { position: relative; flex: 1 1 auto; display: flex; flex-direction: column; margin-top: 2px; min-height: 62mm; }
  .items { flex: 1; height: 100%; font-size: 7.5px; table-layout: fixed; }
  .items th { font-size: 7px; text-align: center; font-weight: 700; line-height: 1.1; }
  .items thead { display: table-header-group; }
  .items td { line-height: 1.2; }
  .items .desc { overflow-wrap: anywhere; }
  .items .desc strong { font-weight: 700; }
  .items tr.pad td { height: 100%; }
  .item-extra { display: block; font-size: 7px; }
  .item-codes { display: block; margin-top: 1px; font-size: 7px; color: #333; }
  .tax-line { display: flex; gap: 2px; white-space: nowrap; }
  .tax-name { color: #333; }
  .tax-value { flex: 1; text-align: right; font-weight: 700; }
  .items td.taxes .tax-line + .tax-line,
  .items td.cst .tax-line + .tax-line { margin-top: 0; }
  .dup { display: inline-block; margin-right: 8px; }
  .extra-place { margin: 1px 0 0; font-size: 9px; }
  .canhoto { margin-top: 6px; border-top: 1px dashed #222; padding-top: 3px; font-size: 7px; line-height: 1.25; }
  .canhoto td { height: 16px; }
  .canhoto strong { font-size: 8px; }
  .watermark {
    position: fixed;
    top: 54%;
    left: -10%;
    width: 120%;
    text-align: center;
    font-size: 52px;
    font-weight: 700;
    letter-spacing: 3px;
    color: rgba(80, 80, 80, .22);
    transform: rotate(-32deg);
    pointer-events: none;
    z-index: 3;
    white-space: nowrap;
  }
</style>
</head>
<body>
  ${watermark ? `<div class="watermark">${watermark}</div>` : ""}
  <section class="sheet">
  ${head(1)}
  <table class="block">
    <tr>
      ${field("Natureza da operação", model.natOp, "58%")}
      ${field("Protocolo de autorização de uso", model.protocol ? `${model.protocol} ${dateTime(model.receivedAt)}` : "")}
    </tr>
  </table>
  <table class="block">
    <tr>
      ${field("Inscrição estadual", model.emit.ie, "", "mid")}
      ${field("Inscrição estadual do subst. tribut.", model.emit.iest)}
      ${field("CNPJ/CPF", documentOf(model.emit.document))}
    </tr>
    <tr>
      <td colspan="2"><span class="label">Tipo de regime de apuração do IBS e da CBS</span><strong>&nbsp;</strong></td>
      ${field("Código do regime tributário", CRT[model.emit.crt] ?? model.emit.crt)}
    </tr>
  </table>
  <table class="block dest">
    <colgroup>
      <col>
      <col style="width:28mm">
      <col style="width:38mm">
      <col style="width:28mm">
      <col style="width:32mm">
    </colgroup>
    <tr><td colspan="5"><span class="label section">Destinatário / remetente</span></td></tr>
    <tr>
      <td colspan="3"><span class="label">Nome / razão social</span><strong>${esc(dest?.name ?? "")}</strong></td>
      ${field("CNPJ/CPF", maskedDocumentOf(dest?.document ?? ""), "", "doc")}
      ${field("Data da emissão", dateOnly(model.dhEmi), "", "side")}
    </tr>
    <tr>
      <td colspan="2"><span class="label">Endereço</span><strong>${esc(dest ? streetLine(dest) : "")}</strong></td>
      ${field("Bairro / distrito", dest?.neighborhood ?? "", "", "doc")}
      ${field("CEP", cepOf(dest?.cep ?? ""), "", "doc")}
      ${field("Data da saída", dateOnly(model.dhSaiEnt), "", "side")}
    </tr>
    <tr>
      <td colspan="2"><span class="label">Município</span><strong>${esc([dest?.city ?? "", dest?.uf ?? ""].filter(Boolean).join(" / "))}</strong></td>
      ${field("Fone / fax", phoneOf(dest?.phone ?? ""))}
      ${field("Inscrição estadual", dest?.ie ?? "")}
      ${field("Hora da saída", timeOnly(model.dhSaiEnt), "", "side")}
    </tr>
  </table>
  ${model.retirada ? `<p class="extra-place"><span class="label section">Local de retirada</span> ${esc([model.retirada.name, streetLine(model.retirada), model.retirada.city, model.retirada.uf].filter(Boolean).join(" — "))}</p>` : ""}
  ${model.entrega ? `<p class="extra-place"><span class="label section">Local de entrega</span> ${esc([model.entrega.name, streetLine(model.entrega), model.entrega.city, model.entrega.uf].filter(Boolean).join(" — "))}</p>` : ""}
  ${invoice}
  ${noteTotals}
  ${icmsTotals}
  ${reformTotals}
  ${issqnTotals}
  <table class="block carrier lead">
    <tr><td><span class="label section">Transportador / volumes transportados</span></td></tr>
  </table>
  <table class="block carrier">
    <colgroup>
      <col style="width:36%">
      <col style="width:13%">
      <col style="width:13%">
      <col style="width:12%">
      <col style="width:8%">
      <col style="width:18%">
    </colgroup>
    <tr>
      ${field("Nome / razão social", model.carrierName, "36%")}
      ${field("Frete por conta", FREIGHT[model.modFrete] ?? model.modFrete, "13%")}
      ${field("Código ANTT", "", "13%")}
      ${field("Placa do veíc.", model.vehiclePlate, "12%")}
      ${field("UF", model.vehicleUf, "8%")}
      ${field("CNPJ/CPF", maskedDocumentOf(model.carrierDocument), "18%")}
    </tr>
    <tr>
      ${field("Endereço", model.carrierAddress, "36%")}
      ${field("Município", model.carrierCity, "13%")}
      ${field("UF", model.carrierUf, "13%")}
      <td colspan="3" style="width:38%"><span class="label">Inscrição estadual</span><strong>${esc(model.carrierIe)}</strong></td>
    </tr>
  </table>
  <table class="block carrier">
    <colgroup>
      <col style="width:16.66%">
      <col style="width:16.66%">
      <col style="width:16.66%">
      <col style="width:16.66%">
      <col style="width:16.66%">
      <col style="width:16.7%">
    </colgroup>
    <tr>
      ${field("Quantidade", volume?.qVol ?? "", "16.66%", "num")}
      ${field("Espécie", volume?.esp ?? "", "16.66%")}
      ${field("Marca", volume?.marca ?? "", "16.66%")}
      ${field("Numeração", volume?.nVol ?? "", "16.66%")}
      ${field("Peso bruto", volume?.pesoB ?? "", "16.66%", "num")}
      ${field("Peso líquido", volume?.pesoL ?? "", "16.7%", "num")}
    </tr>
  </table>
  ${products(pages[0] ?? [])}
  ${totalPages === 1 ? "" : "</section>"}
  ${pages.slice(1).map((group, index) => {
    const current = index + 2;
    const last = current === totalPages;
    return `<section class="sheet">${head(current)}${products(group)}${last ? "" : "</section>"}`;
  }).join("")}
  <table class="block">
    <tr>
      <td style="height:28mm">
        <span class="label section">Dados adicionais</span>
        <span class="label">Informações complementares</span>
        ${additional}
      </td>
      <td style="width:32%">
        <span class="label section">Reservado ao fisco</span>
      </td>
    </tr>
  </table>
  <table class="canhoto">
    <tr>
      <td>RECEBEMOS DE ${esc(model.emit.name)} OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA Nº ${esc(number)}. EMISSÃO: ${dateOnly(model.dhEmi)} VALOR TOTAL: ${moneyOrZero(model.totals.vNf)} DESTINATÁRIO: ${esc(dest?.name ?? "")}${destPlace ? ` - ${esc(destPlace)}` : ""}</td>
      <td style="width:88px;text-align:center"><span class="label">NF-e</span><strong>${esc(number)}</strong><br>SÉRIE ${esc(model.serie)}</td>
    </tr>
    <tr>
      <td>DATA DO RECEBIMENTO</td>
      <td>IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</td>
    </tr>
  </table>
  </section>
  ${options.autoPrint ? AUTO_PRINT_SCRIPT : ""}
</body>
</html>`;
};
