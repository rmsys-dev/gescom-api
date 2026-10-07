import { qrCodeSvg } from "./barcode.js";
import {
  AUTO_PRINT_SCRIPT,
  PAYMENT,
  cepOf,
  chaveGroups,
  dateTime,
  documentOf,
  esc,
  maskedDocumentOf,
  money,
  noteNumber,
  qty,
} from "./danfe-html.js";
import type { DanfeModel } from "./parse-xml.js";

const filled = (value: string): boolean => Boolean(value) && Number(value) !== 0;

const sum = (...values: string[]): string =>
  String(values.reduce((total, value) => total + (Number(value) || 0), 0));

const line = (label: string, value: string, className = ""): string =>
  `<div class="row${className ? ` ${className}` : ""}"><span>${label}</span><strong>${value}</strong></div>`;

const STYLE = `
  @page { size: 80mm auto; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body { width: 80mm; padding: 3mm 3mm 4mm; color: #000; font: 9px/1.3 Arial, Helvetica, sans-serif; }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .logo { display: block; max-width: 40mm; max-height: 16mm; margin: 0 auto 2px; object-fit: contain; }
  .sep { border-top: 1px dashed #000; margin: 4px 0; }
  .title { font-size: 9.5px; font-weight: 700; text-align: center; text-transform: uppercase; }
  .warning { margin: 3px 0; padding: 2px; border: 1px solid #000; font-weight: 700; text-align: center; text-transform: uppercase; }
  table.items { width: 100%; border-collapse: collapse; table-layout: fixed; }
  table.items th { font-size: 8px; text-align: left; border-bottom: 1px solid #000; padding: 1px 0; }
  table.items td { font-size: 8px; padding: 1px 0; vertical-align: top; }
  table.items .num { text-align: right; }
  table.items .desc { word-break: break-word; }
  .row { display: flex; justify-content: space-between; gap: 6px; }
  .row strong { text-align: right; }
  .row.big { font-size: 10.5px; }
  .chave { margin-top: 2px; font-size: 9px; font-weight: 700; text-align: center; letter-spacing: 0.2px; }
  .chave span { margin: 0 2px; }
  .url { word-break: break-all; text-align: center; }
  .qrcode { display: flex; justify-content: center; margin: 4px 0; }
  .qrcode svg { width: 32mm; height: 32mm; }
  .small { font-size: 8px; }
  .pre { white-space: pre-wrap; word-break: break-word; }
`;

const consumerBlock = (model: DanfeModel): string => {
  const dest = model.dest;
  const document = dest?.document ?? "";
  if (!document && !dest?.name) {
    return `<div class="center bold">CONSUMIDOR NÃO IDENTIFICADO</div>`;
  }
  const label = document.replace(/\D/g, "").length === 14 ? "CNPJ" : document ? "CPF" : "";
  const address = dest
    ? [
        [dest.street, dest.number].filter(Boolean).join(", "),
        dest.neighborhood,
        [dest.city, dest.uf].filter(Boolean).join(" - "),
      ]
        .filter(Boolean)
        .join(", ")
    : "";
  return [
    `<div class="center bold">CONSUMIDOR${label ? ` - ${label} ${esc(maskedDocumentOf(document))}` : ""}</div>`,
    dest?.name ? `<div class="center">${esc(dest.name)}</div>` : "",
    address ? `<div class="center small">${esc(address)}</div>` : "",
  ].join("");
};

/** DANFE NFC-e (modelo 65) em bobina de 80 mm, conforme o leiaute do Anexo I do MOC. */
export const renderDanfeNfceHtml = (
  model: DanfeModel,
  options: { logoSrc?: string | null; cancelled?: boolean; autoPrint?: boolean } = {},
): string => {
  const emit = model.emit;
  const cancelled = options.cancelled === true;
  const homologation = !cancelled && model.tpAmb === "2";
  const contingency = model.tpEmis === "9";
  const emitAddress = [
    [emit.street, emit.number].filter(Boolean).join(", "),
    emit.complement,
    emit.neighborhood,
    [emit.city, emit.uf].filter(Boolean).join(" - "),
    emit.cep ? `CEP ${cepOf(emit.cep)}` : "",
  ]
    .filter(Boolean)
    .join(", ");
  const additions = sum(model.totals.vOutro, model.totals.vFrete, model.totals.vSeg);
  const itemsTotal = model.items.reduce((total, item) => total + (Number(item.vProd) || 0), 0);
  const qrContent = model.qrCode || model.chave;

  const items = model.items
    .map(
      (item) => `<tr>
        <td>${esc(item.cProd)}</td>
        <td class="desc">${esc(item.xProd)}</td>
        <td class="num">${qty(item.qCom)}</td>
        <td>${esc(item.uCom)}</td>
        <td class="num">${money(item.vUnCom)}</td>
        <td class="num">${money(item.vProd)}</td>
      </tr>`,
    )
    .join("");

  const payments = model.payments
    .map((payment) => line(esc(PAYMENT[payment.tPag] ?? (payment.xPag || payment.tPag)), money(payment.vPag)))
    .join("");

  return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><title>DANFE NFC-e ${esc(model.nNf)}</title><style>${STYLE}</style></head>
<body>
  ${options.logoSrc ? `<img class="logo" src="${esc(options.logoSrc)}" alt="">` : ""}
  <div class="center bold">${esc(emit.name)}</div>
  <div class="center">CNPJ: ${esc(documentOf(emit.document))}${emit.ie ? ` &nbsp; IE: ${esc(emit.ie)}` : ""}</div>
  <div class="center small">${esc(emitAddress)}</div>
  <div class="sep"></div>
  <div class="title">DANFE NFC-e - Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</div>
  ${contingency ? `<div class="warning">EMITIDA EM CONTINGÊNCIA</div><div class="center small">Pendente de autorização</div>` : ""}
  ${cancelled ? `<div class="warning">NFC-e CANCELADA</div>` : ""}
  ${homologation ? `<div class="warning">EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL</div>` : ""}
  <div class="sep"></div>
  <table class="items">
    <colgroup><col style="width:14%"><col><col style="width:11%"><col style="width:8%"><col style="width:15%"><col style="width:16%"></colgroup>
    <thead><tr><th>Código</th><th>Descrição</th><th class="num">Qtde</th><th>Un</th><th class="num">Vl Unit</th><th class="num">Vl Total</th></tr></thead>
    <tbody>${items}</tbody>
  </table>
  <div class="sep"></div>
  ${line("QTD. TOTAL DE ITENS", String(model.items.length))}
  ${line("VALOR TOTAL R$", money(model.totals.vProd || String(itemsTotal)))}
  ${filled(model.totals.vDesc) ? line("Desconto R$", money(model.totals.vDesc)) : ""}
  ${filled(additions) ? line("Acréscimos R$", money(additions)) : ""}
  ${line("VALOR A PAGAR R$", money(model.totals.vNf), "big bold")}
  ${line("FORMA DE PAGAMENTO", "VALOR PAGO R$", "bold")}
  ${payments}
  ${filled(model.vTroco) ? line("Troco R$", money(model.vTroco)) : ""}
  <div class="sep"></div>
  <div class="center bold">Consulte pela Chave de Acesso em</div>
  <div class="url">${esc(model.urlChave || "www.nfce.fazenda.gov.br")}</div>
  <div class="chave">${chaveGroups(model.chave)}</div>
  <div class="sep"></div>
  ${consumerBlock(model)}
  <div class="sep"></div>
  <div class="center bold">NFC-e nº ${esc(noteNumber(model.nNf))} &nbsp; Série ${esc(model.serie)} &nbsp; ${esc(dateTime(model.dhEmi))}</div>
  ${model.protocol ? `<div class="center">Protocolo de Autorização: ${esc(model.protocol)}</div>` : ""}
  ${model.receivedAt ? `<div class="center">Data de Autorização: ${esc(dateTime(model.receivedAt))}</div>` : ""}
  <div class="qrcode">${qrCodeSvg(qrContent)}</div>
  ${filled(model.totals.vTotTrib) ? `<div class="center small">Tributos Totais Incidentes (Lei Federal 12.741/2012): R$ ${money(model.totals.vTotTrib)}</div>` : ""}
  ${model.infCpl ? `<div class="sep"></div><div class="small pre">${esc(model.infCpl)}</div>` : ""}
  ${options.autoPrint ? AUTO_PRINT_SCRIPT : ""}
</body>
</html>`;
};
