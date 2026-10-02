import { code128Svg } from "./barcode.js";
import type { DanfeItem, DanfeModel, DanfeParty } from "./parse-xml.js";

const FREIGHT: Record<string, string> = {
  "0": "0-Emitente (CIF)",
  "1": "1-Destinatário (FOB)",
  "2": "2-Terceiros",
  "3": "3-Próprio Remetente",
  "4": "4-Próprio Destinatário",
  "9": "9-Sem Transp.",
};

const PAYMENT: Record<string, string> = {
  "01": "Dinheiro",
  "02": "Cheque",
  "03": "Cartão de Crédito",
  "04": "Cartão de Débito",
  "05": "Crédito Loja",
  "15": "Boleto Bancário",
  "16": "Depósito Bancário",
  "17": "Pagamento Instantâneo (PIX)",
  "18": "Transferência bancária",
  "90": "Sem pagamento",
  "99": "Outros",
};

const esc = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const money = (value: string): string => {
  if (!value) return "";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return esc(value);
  return amount.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const moneyOrZero = (value: string): string => money(value || "0");

const qty = (value: string): string => {
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
const dateTime = (value: string): string => {
  const parts = dateParts(value);
  if (!parts) return esc(value);
  return parts.time ? `${parts.date} ${parts.time}` : parts.date;
};

const documentOf = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 14) {
    return digits.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  }
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  return value;
};

const cepOf = (value: string): string => {
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

const chaveGroups = (value: string): string =>
  (value.replace(/\D/g, "").match(/.{1,4}/g) ?? [])
    .map((group) => `<span>${esc(group)}</span>`)
    .join("");

const noteNumber = (value: string): string => {
  const digits = value.replace(/\D/g, "");
  if (!digits) return value;
  return Number(digits).toLocaleString("pt-BR");
};

const field = (label: string, value: string, width = "", className = ""): string =>
  `<td${className ? ` class="${className}"` : ""}${width ? ` style="width:${width}"` : ""}><span class="label">${label}</span><strong>${esc(value)}</strong></td>`;

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

const itemWeight = (item: DanfeItem): number =>
  Math.max(1, Math.ceil((item.xProd.length + 8) / 46));

const paginateItems = (items: DanfeItem[]): DanfeItem[][] => {
  if (items.length === 0) return [[]];
  const pages: DanfeItem[][] = [];
  let index = 0;
  let first = true;
  while (index < items.length) {
    let ahead = 0;
    for (let cursor = index; cursor < items.length; cursor += 1) ahead += itemWeight(items[cursor]);
    const cap = ahead <= (first ? 11 : 18) ? (first ? 11 : 18) : (first ? 16 : 26);
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

const itemRow = (item: DanfeItem): string => {
  const extra = [
    item.vIbs ? `IBS ${money(item.vIbs)}` : "",
    item.vCbs ? `CBS ${money(item.vCbs)}` : "",
  ].filter(Boolean).join(" · ");
  return (
    `<tr>` +
    `<td>${esc(item.cProd)}</td>` +
    `<td class="desc">${esc(item.xProd)}${extra ? `<span class="item-extra">${esc(extra)}</span>` : ""}</td>` +
    `<td class="center">${esc(item.ncm)}</td>` +
    `<td class="center">${esc(cstOf(item.orig, item.cst))}</td>` +
    `<td class="center">${esc(item.cfop)}</td>` +
    `<td class="center">${esc(item.uCom)}</td>` +
    `<td class="num">${qty(item.qCom)}</td>` +
    `<td class="num">${money(item.vUnCom)}</td>` +
    `<td class="num">${money(item.vProd)}</td>` +
    `<td class="num">${money(item.vBc)}</td>` +
    `<td class="num">${money(item.vIcms)}</td>` +
    `<td class="num">${rate(item.pIcms)}</td>` +
    `<td class="num">${money(item.vTotTrib)}</td>` +
    `</tr>`
  );
};

export const renderDanfeHtml = (model: DanfeModel): string => {
  const draft = !model.authorized || model.tpAmb !== "1";
  const operation = model.tpNf === "0" ? "0" : "1";
  const number = noteNumber(model.nNf);
  const barcode = code128Svg(model.chave.replace(/\D/g, ""));
  const pages = paginateItems(model.items);
  const duplicates = model.duplicates
    .map((row) => `<span class="dup">Dup. ${esc(row.nDup)} · Venc. ${dateOnly(row.dVenc)} · ${money(row.vDup)}</span>`)
    .join("");
  const payments = model.payments
    .map((row) => `${esc(row.xPag || PAYMENT[row.tPag] || row.tPag)} ${money(row.vPag)}`)
    .join(" · ");
  const volume = model.volumes[0];
  const extraTax = [
    model.totals.vIbs && Number(model.totals.vIbs) !== 0 ? `IBS ${money(model.totals.vIbs)}` : "",
    model.totals.vCbs && Number(model.totals.vCbs) !== 0 ? `CBS ${money(model.totals.vCbs)}` : "",
  ].filter(Boolean).join(" · ");
  const additional = [model.infAdFisco, model.infCpl, payments ? `Pagamento: ${payments}` : ""]
    .filter(Boolean)
    .map((line) => esc(line))
    .join("<br>");
  const dest = model.dest;
  const destPlace = dest
    ? [streetLine(dest), dest.neighborhood, dest.cep ? cepOf(dest.cep) : "", dest.city, dest.uf]
        .filter(Boolean)
        .join(", ")
    : "";
  const invoice = hasInvoice(model)
    ? `<table>
        <tr><td colspan="4"><span class="label">FATURA / DUPLICATA</span></td></tr>
        <tr>
          ${field("NÚMERO", model.invoiceNumber)}
          ${field("VALOR ORIGINAL", money(model.invoiceOriginal), "", "num")}
          ${field("DESCONTO", money(model.invoiceDiscount), "", "num")}
          ${field("VALOR LÍQUIDO", money(model.invoiceNet), "", "num")}
        </tr>
        ${duplicates ? `<tr><td colspan="4">${duplicates}</td></tr>` : ""}
      </table>`
    : "";

  const totalPages = pages.length;
  const head = (current: number) => `<table>
    <tr>
      <td class="emit" style="width:42%">
        <span class="label">Identificação do emitente</span>
        <div class="emit-name">${esc(model.emit.name)}</div>
        ${model.emit.fantasy ? `<div>${esc(model.emit.fantasy)}</div>` : ""}
        <div class="emit-address">${emitAddress(model.emit)}</div>
      </td>
      <td class="danfe-box">
        <div class="danfe-title">DANFE</div>
        <div class="danfe-sub">Documento Auxiliar da Nota Fiscal Eletrônica</div>
        <div class="entry">0-ENTRADA<br>1-SAÍDA <b>${operation}</b></div>
        <div class="nf-num">Nº ${esc(number)}</div>
        <div>SÉRIE ${esc(model.serie)}</div>
        <div>FOLHA ${current}/${totalPages}</div>
      </td>
      <td class="access">
        <div class="barcode">${barcode}</div>
        <span class="label">Chave de acesso</span>
        <span class="chave">${chaveGroups(model.chave)}</span>
        <div class="consult">Consulta de autenticidade no portal nacional da NF-e<br>www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora</div>
      </td>
    </tr>
  </table>`;
  const products = (group: DanfeItem[]) => {
    const rows = group.map(itemRow).join("") || `<tr><td colspan="13">&nbsp;</td></tr>`;
    return `<div class="items-wrap">
      <table class="items">
        <thead>
          <tr><th colspan="13">DADOS DOS PRODUTOS / SERVIÇOS</th></tr>
          <tr>
            <th>CÓDIGO<br>PRODUTO</th><th>DESCRIÇÃO DO PRODUTO / SERVIÇO</th><th>NCM/SH</th><th>CST</th><th>CFOP</th><th>UNID</th><th>QUANT</th>
            <th>VALOR<br>UNIT</th><th>VALOR<br>TOTAL</th><th>B.CÁLC<br>ICMS</th><th>VALOR<br>ICMS</th><th>ALÍQ.<br>ICMS</th><th>V.APROX.<br>TRIBUTOS</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="pad">${"<td></td>".repeat(13)}</tr>
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
  @page { size: A4 portrait; margin: 4mm 5mm 5mm; }
  * { box-sizing: border-box; }
  html, body { margin: 0; color: #111; font-family: Arial, Helvetica, sans-serif; font-size: 10px; }
  .sheet { height: 284mm; display: flex; flex-direction: column; break-after: page; overflow: hidden; }
  .sheet:last-child { break-after: auto; }
  table { width: 100%; border-collapse: collapse; }
  td, th { border: 1px solid #222; padding: 2px 3px; vertical-align: top; }
  .label { display: block; color: #222; font-size: 7.5px; font-weight: 400; line-height: 1.15; text-transform: uppercase; }
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
  table.carrier { table-layout: fixed; width: 100%; margin-top: -1px; }
  table.carrier.lead { margin-top: 2px; }
  table.carrier td { overflow-wrap: anywhere; }
  td.emit { text-align: center; }
  td.emit .label { text-align: left; }
  .emit-name { font-size: 13px; font-weight: 700; line-height: 1.15; text-transform: uppercase; }
  .emit-address { margin-top: 2px; line-height: 1.25; }
  .danfe-box { width: 108px; text-align: center; }
  .danfe-title { font-size: 16px; font-weight: 700; letter-spacing: .6px; line-height: 1; }
  .danfe-sub { font-size: 8px; line-height: 1.15; margin: 1px 0 3px; }
  .entry { font-size: 9px; line-height: 1.2; }
  .entry b { display: inline-block; border: 1px solid #222; min-width: 12px; margin-left: 4px; padding: 0 2px; font-size: 10px; }
  .barcode svg { display: block; width: 100%; height: 42px; }
  .access { text-align: center; }
  .access .label { text-align: center; }
  .chave { display: block; margin: 1px 0 2px; font-size: 9px; font-weight: 700; white-space: nowrap; text-align: center; }
  .chave span { display: inline-block; margin: 0 1.5px; }
  .consult { font-size: 7.5px; line-height: 1.25; text-align: center; }
  .items-wrap { position: relative; flex: 1 1 auto; display: flex; flex-direction: column; margin-top: 2px; min-height: 62mm; }
  .items { flex: 1; height: 100%; font-size: 9px; }
  .items th { font-size: 7.5px; text-align: center; font-weight: 700; line-height: 1.1; }
  .items thead { display: table-header-group; }
  .items .desc { min-width: 120px; }
  .items tr.pad td { height: 100%; }
  .item-extra { display: block; font-size: 8px; }
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
  ${draft ? `<div class="watermark">SEM VALOR FISCAL</div>` : ""}
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
  </table>
  <table class="block dest">
    <colgroup>
      <col>
      <col style="width:28mm">
      <col style="width:38mm">
      <col style="width:28mm">
      <col style="width:32mm">
    </colgroup>
    <tr><td colspan="5"><span class="label">Destinatário / remetente</span></td></tr>
    <tr>
      <td colspan="3"><span class="label">Nome / razão social</span><strong>${esc(dest?.name ?? "")}</strong></td>
      ${field("CNPJ/CPF", documentOf(dest?.document ?? ""), "", "doc")}
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
  ${model.retirada ? `<p class="extra-place"><span class="label">Local de retirada</span> ${esc([model.retirada.name, streetLine(model.retirada), model.retirada.city, model.retirada.uf].filter(Boolean).join(" — "))}</p>` : ""}
  ${model.entrega ? `<p class="extra-place"><span class="label">Local de entrega</span> ${esc([model.entrega.name, streetLine(model.entrega), model.entrega.city, model.entrega.uf].filter(Boolean).join(" — "))}</p>` : ""}
  ${invoice}
  <table class="block tax">
    <tr><td colspan="5"><span class="label">Cálculo do imposto</span></td></tr>
    <tr>
      ${field("B. cálc. ICMS", moneyOrZero(model.totals.vBc))}
      ${field("Vlr. ICMS", moneyOrZero(model.totals.vIcms))}
      ${field("B. cálc. ICMS ST", moneyOrZero(model.totals.vBcSt))}
      ${field("Vlr. ICMS ST", moneyOrZero(model.totals.vSt))}
      ${field("Total dos produtos", moneyOrZero(model.totals.vProd))}
    </tr>
  </table>
  <table class="block tax">
    <tr>
      ${field("Vlr. frete", moneyOrZero(model.totals.vFrete))}
      ${field("Vlr. seguro", moneyOrZero(model.totals.vSeg))}
      ${field("Vlr. desconto", moneyOrZero(model.totals.vDesc))}
      ${field("Outras desp.", moneyOrZero(model.totals.vOutro))}
      ${field("Vlr. IPI", moneyOrZero(model.totals.vIpi))}
      ${field("Vlr. aprox. trib.", moneyOrZero(model.totals.vTotTrib))}
      ${field("Total da nota", moneyOrZero(model.totals.vNf))}
    </tr>
    ${extraTax ? `<tr><td colspan="7">${esc(extraTax)}</td></tr>` : ""}
  </table>
  <table class="block carrier lead">
    <tr><td><span class="label">Transportador / volumes transportados</span></td></tr>
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
      ${field("CNPJ/CPF", documentOf(model.carrierDocument), "18%")}
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
        <span class="label">Dados adicionais</span>
        <span class="label">Informações complementares</span>
        ${additional}
      </td>
      <td style="width:32%">
        <span class="label">Reservado ao fisco</span>
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
</body>
</html>`;
};
