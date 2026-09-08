import { loadPrintLogoSrc } from "./load-print-logo.js";

type Decimalish = string | number | null | undefined;

const SERVICE_PRODUCT_TYPE_CODE = "09";

export type WorkOrderPrintItem = {
  productCode?: string | number | null;
  description?: string | null;
  productDescription?: string | null;
  quantity?: Decimalish;
  valueUnit?: Decimalish;
  valueDiscount?: Decimalish;
  valueAcresce?: Decimalish;
  valueTotal?: Decimalish;
  typeService?: string | null;
  productType?: { type?: string | null } | null;
  unit?: { unit?: string | null } | null;
  sector?: { description?: string | null } | null;
  location?: { box?: string | null; description?: string | null } | null;
  mechanics?: Array<{ member?: { userName?: string | null } | null }>;
};

export type WorkOrderPrintSale = {
  orderNumber: number;
  type: string;
  status: string;
  serviceType?: string | null;
  modelService?: string | null;
  createdAt: Date | string;
  completedionDate?: Date | string | null;
  vehicleMileage?: number | null;
  observations?: string | null;
  defect?: string | null;
  subTotal?: Decimalish;
  discountValuetems?: Decimalish;
  valueAcresceItems?: Decimalish;
  percentageDiscountProduct?: Decimalish;
  valueDiscountFinancialProduct?: Decimalish;
  percentageDiscountService?: Decimalish;
  valueDiscountFinancialService?: Decimalish;
  percentageAcresceProduct?: Decimalish;
  valueAcresceFinancialProduct?: Decimalish;
  percentageAcresceService?: Decimalish;
  valueAcresceFinancialService?: Decimalish;
  valueProduct?: Decimalish;
  valueService?: Decimalish;
  valueLiquid?: Decimalish;
  returnSituation?: string | null;
  user?: { userName?: string | null } | null;
  userLegalName?: string | null;
  seller?: { userName?: string | null } | null;
  sellerLegalName?: string | null;
  userModificationService?: { userName?: string | null } | null;
  userClosedService?: { userName?: string | null } | null;
  memberRef?: { userName?: string | null } | null;
  member?: {
    memberLegalName?: string | null;
    registration?: string | null;
    memberAddress?: string | null;
    memberCep?: string | null;
    memberCity?: string | null;
    memberState?: string | null;
    memberPhone?: string | null;
    memberMobile?: string | null;
  } | null;
  vehiclesEnterprisesMembers?: {
    plate?: string | null;
    model?: string | null;
    vehicleYear?: number | null;
    color?: string | null;
    fuelType?: string | null;
    fleetNumber?: string | null;
    renavam?: string | null;
    vehicleType?: string | null;
    bodyType?: string | null;
    axleType?: string | null;
    capacityKg?: Decimalish;
    capacityM3?: Decimalish;
    tareWeight?: Decimalish;
    rntrcCode?: string | null;
    entireCode?: string | null;
    ownerType?: string | null;
    location?: string | null;
    licensingStateAcronym?: string | null;
    licensingStateName?: string | null;
  } | null;
  items?: WorkOrderPrintItem[];
  payments?: Array<{
    valueTotal?: Decimalish;
    paymentType?: {
      description?: string | null;
      paymentType?: string | null;
    } | null;
    dues?: Array<{
      valueInstallment?: Decimalish;
      dueDate?: Date | string | null;
    }>;
  }>;
  sourceBudget?: { orderNumber?: number | null } | null;
  generatedSales?: Array<{ orderNumber?: number | null }>;
};

export type WorkOrderPrintEnterprise = {
  legalName: string;
  tradeName: string;
  registration: string;
  phone?: string | null;
  email?: string | null;
  whatsapp?: string | null;
  addresses?: Array<{
    adressType?: string | null;
    number?: string | null;
    complement?: string | null;
    cep?: {
      cepNumber?: string | null;
      address?: string | null;
      neighborhood?: string | null;
      city?: {
        citieName?: string | null;
        state?: { acronym?: string | null } | null;
      } | null;
    } | null;
  }>;
};

export type WorkOrderPrintInput = {
  sale: WorkOrderPrintSale;
  enterprise: WorkOrderPrintEnterprise;
  printedAt: Date;
  /** `pdf` omite toolbar/script; usado na geração do arquivo. */
  mode?: "html" | "pdf";
};

export const workOrderPdfFilename = (orderNumber: number): string =>
  `OS-${formatOrderNumber(orderNumber)}.pdf`;

const moneyFmt = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});
const numberFmt = new Intl.NumberFormat("pt-BR", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});
const intFmt = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 0 });

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const text = (value: string | number | null | undefined, fallback = "—") => {
  if (value === null || value === undefined) return escapeHtml(fallback);
  const s = String(value).trim();
  return escapeHtml(s.length > 0 ? s : fallback);
};

const enumLabel = (value: string | null | undefined) =>
  text(value ? value.replaceAll("_", " ") : null);

export const parseDecimal = (value: Decimalish): number | null => {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : null;
};

export const isZeroish = (value: Decimalish): boolean => {
  const n = parseDecimal(value);
  return n === null || n === 0;
};

export const formatMoney = (value: Decimalish): string => {
  const n = parseDecimal(value);
  return n === null ? "—" : moneyFmt.format(n);
};

export const formatQty = (value: Decimalish): string => {
  const n = parseDecimal(value);
  return n === null ? "—" : numberFmt.format(n);
};

export const formatKm = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "—";
  return `${intFmt.format(value)} km`;
};

export const formatOrderNumber = (orderNumber: number): string =>
  String(orderNumber).padStart(6, "0");

export const formatDocument = (value: string | null | undefined): string => {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 11) {
    return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  }
  if (digits.length === 14) {
    return digits.replace(
      /(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/,
      "$1.$2.$3/$4-$5",
    );
  }
  return value;
};

export const formatCep = (value: string | null | undefined): string => {
  if (!value) return "—";
  const digits = value.replace(/\D/g, "");
  if (digits.length === 8) {
    return `${digits.slice(0, 5)}-${digits.slice(5)}`;
  }
  return value;
};

export const formatDateTime = (value: Date | string | null | undefined) => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
};

export const formatDate = (value: Date | string | null | undefined) => {
  if (!value) return "—";
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(d);
};

const itemIsService = (item: WorkOrderPrintItem) =>
  item.productType?.type === SERVICE_PRODUCT_TYPE_CODE;

const itemDescription = (item: WorkOrderPrintItem) =>
  item.description?.trim() || item.productDescription?.trim() || "—";

const itemCode = (item: WorkOrderPrintItem) =>
  item.productCode === null || item.productCode === undefined
    ? "—"
    : String(item.productCode);

const mechanicNames = (item: WorkOrderPrintItem) =>
  (item.mechanics ?? [])
    .map((m) => m.member?.userName?.trim())
    .filter((name): name is string => Boolean(name))
    .join(", ");

const locationLine = (item: WorkOrderPrintItem) => {
  const parts: string[] = [];
  if (item.sector?.description) parts.push(`Setor: ${item.sector.description}`);
  const loc = [item.location?.box, item.location?.description]
    .filter(Boolean)
    .join(" — ");
  if (loc) parts.push(`Loc: ${loc}`);
  return parts.join("  ");
};

const principalAddress = (enterprise: WorkOrderPrintEnterprise) => {
  const addresses = enterprise.addresses ?? [];
  return (
    addresses.find((a) => a.adressType === "PRINCIPAL") ?? addresses[0] ?? null
  );
};

const dlItem = (label: string, value: string) =>
  `<div class="kv"><dt>${escapeHtml(label)}</dt><dd>${value}</dd></div>`;

const isBlankPrintValue = (value: string | null | undefined): boolean => {
  if (value === null || value === undefined) return true;
  const s = String(value).trim();
  return s.length === 0 || s === "—";
};

/** Omite o campo quando não há dado (não imprime "—"). */
const dlItemIf = (label: string, value: string | null | undefined) => {
  if (isBlankPrintValue(value)) return "";
  return dlItem(label, escapeHtml(String(value).trim()));
};

/** Linha inteira "Rótulo: valor" para preencher o quadro. */
const stackLine = (label: string, value: string | null | undefined) => {
  if (isBlankPrintValue(value)) return "";
  return `<tr><td class="stack-line"><span class="lbl">${escapeHtml(label)}:</span> ${escapeHtml(String(value).trim())}</td></tr>`;
};

const stackParts = (
  parts: Array<[string, string | null | undefined]>,
): string => {
  const filled = parts
    .filter(([, value]) => !isBlankPrintValue(value))
    .map(
      ([label, value]) =>
        `<span class="lbl">${escapeHtml(label)}:</span> ${escapeHtml(String(value).trim())}`,
    );
  if (filled.length === 0) return "";
  return `<tr><td class="stack-line">${filled.join(", ")}</td></tr>`;
};

const moneyCell = (value: Decimalish) =>
  `<td class="num">${escapeHtml(formatMoney(value))}</td>`;

const qtyCell = (value: Decimalish) =>
  `<td class="num">${escapeHtml(formatQty(value))}</td>`;

const totalRow = (
  label: string,
  value: Decimalish,
  opts?: { hideZero?: boolean; strong?: boolean; extra?: string },
) => {
  if (opts?.hideZero && isZeroish(value)) return "";
  const extra = opts?.extra ? ` ${escapeHtml(opts.extra)}` : "";
  const cls = opts?.strong ? ' class="strong"' : "";
  return `<tr${cls}><td>${escapeHtml(label)}${extra}</td><td class="num">${escapeHtml(formatMoney(value))}</td></tr>`;
};

const percentHint = (value: Decimalish) => {
  if (isZeroish(value)) return "";
  const n = parseDecimal(value);
  return n === null ? "" : `(${numberFmt.format(n)}%)`;
};

const PRINT_CSS = `
@page { size: A4; margin: 8mm; }
* { box-sizing: border-box; }
html, body {
  margin: 0;
  padding: 0;
  font-family: Arial, Helvetica, sans-serif;
  font-size: 9pt;
  color: #111;
  background: #fff;
}
.toolbar {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  margin-bottom: 8px;
}
.toolbar button {
  font-size: 10pt;
  padding: 6px 12px;
  cursor: pointer;
}
.sheet { width: 100%; }
.block {
  border: 0.4pt solid #333;
  margin-bottom: 6px;
}
.block-title {
  background: #e8e8e8;
  font-weight: 700;
  font-size: 8pt;
  letter-spacing: 0.04em;
  padding: 3px 6px;
  text-transform: uppercase;
}
.pad { padding: 6px; }
.header {
  display: grid;
  grid-template-columns: 1fr 58mm;
  gap: 8px;
}
.os-box {
  border: 0.8pt solid #111;
  padding: 6px 8px;
  text-align: center;
}
.os-box h1 {
  margin: 0 0 4px;
  font-size: 13pt;
  letter-spacing: 0.02em;
}
.os-num { font-size: 16pt; font-weight: 700; }
.brand { display: flex; gap: 8px; align-items: flex-start; }
.logo { height: 18mm; width: auto; max-width: 40mm; object-fit: contain; }
.company .trade { font-size: 12pt; font-weight: 700; }
.company .stack { flex: 1; min-width: 0; }
.muted { color: #333; font-size: 8pt; }
.split {
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.split > .col + .col { border-left: 0.4pt solid #333; }
.kv { display: grid; grid-template-columns: 28mm 1fr; gap: 2px 6px; margin: 1px 0; }
.kv dt { font-weight: 700; color: #333; font-size: 7.5pt; }
.kv dd { margin: 0; }
.stack {
  font-size: 8pt;
  line-height: 1.5;
}
.stack-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}
.stack-table td {
  display: table-cell;
  width: 100%;
  padding: 0 0 3px;
  line-height: 1.5;
  vertical-align: top;
}
.stack-line .lbl { font-weight: 700; }
.pre {
  white-space: pre-wrap;
  min-height: 14px;
  margin: 0;
}
table.items {
  width: 100%;
  border-collapse: collapse;
  font-size: 7.5pt;
}
table.items th, table.items td {
  border-bottom: 0.3pt solid #bbb;
  padding: 3px 4px;
  vertical-align: top;
}
table.items th {
  background: #f3f3f3;
  text-align: left;
  font-size: 7pt;
  text-transform: uppercase;
}
table.items .num { text-align: right; white-space: nowrap; }
.subline { color: #444; font-size: 7pt; }
.subtotal {
  text-align: right;
  font-weight: 700;
  padding: 4px 6px;
  font-size: 8pt;
}
.bottom {
  display: grid;
  grid-template-columns: 1fr 80mm;
  gap: 6px;
}
table.totals { width: 100%; border-collapse: collapse; font-size: 8pt; }
table.totals td { padding: 2px 4px; }
table.totals .strong td {
  font-weight: 700;
  font-size: 10pt;
  border-top: 0.6pt solid #111;
  padding-top: 5px;
}
.terms { font-size: 7pt; line-height: 1.35; margin: 6px 0; }
.signs {
  width: 100%;
  border-collapse: separate;
  border-spacing: 18px 0;
  table-layout: fixed;
  margin-top: 10px;
}
.sign {
  width: 50%;
  text-align: center;
  padding: 14mm 8px 4px;
  font-size: 8pt;
  vertical-align: bottom;
}
.sign-line {
  border-top: 0.6pt solid #111;
  margin: 0 6px 4px;
}
.ops { font-size: 8pt; }
.printed-at {
  margin: 6px 0 0;
  padding: 0;
  text-align: left;
  font-size: 7.5pt;
  font-weight: 700;
  color: #111;
}
@media print {
  .no-print { display: none !important; }
  body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
  thead { display: table-header-group; }
}
`;

const partsTable = (items: WorkOrderPrintItem[]) => {
  if (items.length === 0) return "";
  const rows = items
    .map((item, i) => {
      const extra = locationLine(item);
      const extraRow = extra
        ? `<tr><td></td><td></td><td class="subline" colspan="7">${text(extra, "")}</td></tr>`
        : "";
      return `<tr>
        <td>${i + 1}</td>
        <td>${text(itemCode(item))}</td>
        <td>${text(itemDescription(item))}</td>
        <td>${text(item.unit?.unit)}</td>
        ${qtyCell(item.quantity)}
        ${moneyCell(item.valueUnit)}
        ${moneyCell(item.valueDiscount)}
        ${moneyCell(item.valueAcresce)}
        ${moneyCell(item.valueTotal)}
      </tr>${extraRow}`;
    })
    .join("");
  return `<section class="block">
    <div class="block-title">Discriminação de peças</div>
    <table class="items">
      <thead>
        <tr>
          <th>#</th><th>Código</th><th>Descrição</th><th>UN</th>
          <th class="num">Qtd</th><th class="num">Unitário</th>
          <th class="num">Desc.</th><th class="num">Acrésc.</th><th class="num">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
};

const servicesTable = (items: WorkOrderPrintItem[]) => {
  if (items.length === 0) return "";
  const showAcresce = items.some((item) => !isZeroish(item.valueAcresce));
  const rows = items
    .map((item, i) => {
      const mechanics = mechanicNames(item);
      const extra = mechanics
        ? `<div class="subline">Mecânico: ${text(mechanics)}</div>`
        : "";
      const acresce = showAcresce ? moneyCell(item.valueAcresce) : "";
      return `<tr>
        <td>${i + 1}</td>
        <td>${text(itemCode(item))}</td>
        <td>${text(itemDescription(item))}${extra}</td>
        <td>${enumLabel(item.typeService)}</td>
        <td>${text(item.unit?.unit)}</td>
        ${qtyCell(item.quantity)}
        ${moneyCell(item.valueUnit)}
        ${moneyCell(item.valueDiscount)}
        ${acresce}
        ${moneyCell(item.valueTotal)}
      </tr>`;
    })
    .join("");
  const acresceHead = showAcresce ? `<th class="num">Acrésc.</th>` : "";
  return `<section class="block">
    <div class="block-title">Discriminação de serviços</div>
    <table class="items">
      <thead>
        <tr>
          <th>#</th><th>Código</th><th>Descrição</th><th>Tipo</th><th>UN</th>
          <th class="num">Qtd</th><th class="num">Unitário</th>
          <th class="num">Desc.</th>${acresceHead}<th class="num">Total</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
};

const paymentsBlock = (sale: WorkOrderPrintSale) => {
  if (sale.status !== "FINALIZADA" || !sale.payments?.length) {
    return `<p class="muted">Pagamento ainda não registrado.</p>`;
  }
  return sale.payments
    .map((payment) => {
      const dues = (payment.dues ?? [])
        .map(
          (due) =>
            `<div>${escapeHtml(formatDateTime(due.dueDate))} — ${escapeHtml(formatMoney(due.valueInstallment))}</div>`,
        )
        .join("");
      const kind = payment.paymentType?.paymentType
        ? ` (${payment.paymentType.paymentType.replaceAll("_", " ")})`
        : "";
      return `<div class="kv">
        <dt>${text(payment.paymentType?.description, "Pagamento")}${escapeHtml(kind)}</dt>
        <dd>${escapeHtml(formatMoney(payment.valueTotal))}${dues}</dd>
      </div>`;
    })
    .join("");
};

export const renderWorkOrderPrintHtml = (
  input: WorkOrderPrintInput,
): string => {
  const { sale, enterprise, printedAt, mode = "html" } = input;
  const logoSrc = loadPrintLogoSrc();
  const items = sale.items ?? [];
  const parts = items.filter((item) => !itemIsService(item));
  const services = items.filter(itemIsService);
  const vehicle = sale.vehiclesEnterprisesMembers;
  const memberName =
    sale.member?.memberLegalName?.trim() ||
    sale.memberRef?.userName?.trim() ||
    "";
  const cityUf = [sale.member?.memberCity, sale.member?.memberState]
    .filter(Boolean)
    .join("/");
  const companyAddress = principalAddress(enterprise);
  const companyStreet = [
    companyAddress?.cep?.address?.trim(),
    companyAddress?.number?.trim(),
  ]
    .filter(Boolean)
    .join(", ");
  const companyCep = companyAddress?.cep?.cepNumber
    ? formatCep(companyAddress.cep.cepNumber)
    : "";
  const origin = sale.sourceBudget?.orderNumber
    ? `Orçamento Nº ${formatOrderNumber(sale.sourceBudget.orderNumber)}`
    : "—";
  const generated = (sale.generatedSales ?? [])
    .map((row) =>
      row.orderNumber != null ? formatOrderNumber(row.orderNumber) : null,
    )
    .filter(Boolean)
    .join(", ");

  const extraVehicle = [
    !isZeroish(vehicle?.capacityKg)
      ? ["Cap. kg", text(formatQty(vehicle?.capacityKg))]
      : null,
    !isZeroish(vehicle?.capacityM3)
      ? ["Cap. m³", text(formatQty(vehicle?.capacityM3))]
      : null,
    !isZeroish(vehicle?.tareWeight)
      ? ["Tara", text(formatQty(vehicle?.tareWeight))]
      : null,
    vehicle?.rntrcCode ? ["RNTRC", text(vehicle.rntrcCode)] : null,
    vehicle?.entireCode ? ["Cód. interno", text(vehicle.entireCode)] : null,
    vehicle?.licensingStateAcronym || vehicle?.licensingStateName
      ? [
          "UF licenciamento",
          text(vehicle.licensingStateAcronym || vehicle.licensingStateName),
        ]
      : null,
    vehicle?.location ? ["Locação", text(vehicle.location)] : null,
  ].filter((row): row is [string, string] => row !== null);

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Ordem de Serviço Nº ${escapeHtml(formatOrderNumber(sale.orderNumber))}</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  ${
    mode === "pdf"
      ? ""
      : `<div class="toolbar no-print">
    <button type="button" onclick="window.print()">Imprimir</button>
  </div>`
  }
  <article class="sheet">
    <section class="block pad header">
      <div class="company">
        <div class="brand">
          ${logoSrc ? `<img class="logo" src="${logoSrc}" alt="" />` : ""}
          <div class="stack">
            <div class="trade">${text(enterprise.tradeName)}</div>
            <table class="stack-table">
            ${stackLine("Razão social", enterprise.legalName)}
            ${stackLine("CNPJ", formatDocument(enterprise.registration))}
            ${stackParts([
              ["Endereço", companyStreet],
              ["Complemento", companyAddress?.complement],
            ])}
            ${stackParts([
              ["Setor", companyAddress?.cep?.neighborhood],
              ["Cidade", companyAddress?.cep?.city?.citieName],
              ["Estado", companyAddress?.cep?.city?.state?.acronym],
            ])}
            ${stackParts([
              ["CEP", companyCep],
              ["Telefone", enterprise.phone],
            ])}
            ${stackLine("E-mail", enterprise.email)}
            </table>
          </div>
        </div>
      </div>
      <div class="os-box">
        <h1>ORDEM DE SERVIÇO</h1>
        <div class="os-num">Nº ${text(formatOrderNumber(sale.orderNumber))}</div>
        ${
          sale.serviceType
            ? `<div>Tipo: ${enumLabel(sale.serviceType)}</div>`
            : ""
        }
        <div>Situação: ${enumLabel(sale.status)}</div>
        <div class="muted">Abertura: ${escapeHtml(formatDateTime(sale.createdAt))}</div>
        <div class="muted">Conclusão: ${escapeHtml(formatDate(sale.completedionDate ?? null))}</div>
        <div class="muted">Origem: ${text(origin)}</div>
        ${generated ? `<div class="muted">Venda gerada: Nº ${text(generated)}</div>` : ""}
      </div>
    </section>

    <section class="block split">
      <div class="col">
        <div class="block-title">Cliente</div>
        <div class="pad">
          ${dlItemIf("Cliente", memberName)}
          ${dlItemIf("CPF/CNPJ", formatDocument(sale.member?.registration))}
          ${dlItemIf("Endereço", sale.member?.memberAddress)}
          ${dlItemIf("CEP", formatCep(sale.member?.memberCep))}
          ${dlItemIf("Cidade/UF", cityUf)}
          ${dlItemIf("Telefone", sale.member?.memberPhone)}
          ${dlItemIf("Celular", sale.member?.memberMobile)}
        </div>
      </div>
      <div class="col">
        <div class="block-title">Veículo</div>
        <div class="pad">
          ${dlItem("Placa", text(vehicle?.plate))}
          ${dlItem("Modelo", text(vehicle?.model))}
          ${dlItem("Ano", text(vehicle?.vehicleYear))}
          ${dlItem("Cor", text(vehicle?.color))}
          ${dlItem("Combustível", enumLabel(vehicle?.fuelType))}
          ${dlItem("KM na entrada", text(formatKm(sale.vehicleMileage)))}
          ${dlItem("Frota", text(vehicle?.fleetNumber))}
          ${extraVehicle.map(([label, value]) => dlItem(label, value)).join("")}
        </div>
      </div>
    </section>

    <section class="block split">
      <div class="col">
        <div class="block-title">Defeito relatado</div>
        <div class="pad"><p class="pre">${text(sale.defect?.trim() || null)}</p></div>
      </div>
      <div class="col">
        <div class="block-title">Observações</div>
        <div class="pad"><p class="pre">${text(sale.observations?.trim() || null)}</p></div>
      </div>
    </section>

    ${partsTable(parts)}
    ${parts.length ? `<div class="subtotal">Subtotal peças: ${escapeHtml(formatMoney(sale.valueProduct))}</div>` : ""}
    ${servicesTable(services)}
    ${services.length ? `<div class="subtotal">Subtotal serviços: ${escapeHtml(formatMoney(sale.valueService))}</div>` : ""}

    <section class="bottom">
      <div class="block">
        <div class="block-title">Pagamento</div>
        <div class="pad">${paymentsBlock(sale)}</div>
      </div>
      <div class="block">
        <div class="block-title">Totais</div>
        <div class="pad">
          <table class="totals">
            ${totalRow("Subtotal itens", sale.subTotal, { hideZero: true })}
            ${totalRow("Desconto nos itens", sale.discountValuetems, { hideZero: true })}
            ${totalRow("Acréscimo nos itens", sale.valueAcresceItems, { hideZero: true })}
            ${totalRow("Peças", sale.valueProduct)}
            ${totalRow("Serviços", sale.valueService)}
            ${totalRow("Desc. financeiro peças", sale.valueDiscountFinancialProduct, { hideZero: true, extra: percentHint(sale.percentageDiscountProduct) })}
            ${totalRow("Desc. financeiro serviços", sale.valueDiscountFinancialService, { hideZero: true, extra: percentHint(sale.percentageDiscountService) })}
            ${totalRow("Acrésc. financeiro peças", sale.valueAcresceFinancialProduct, { hideZero: true, extra: percentHint(sale.percentageAcresceProduct) })}
            ${totalRow("Acrésc. financeiro serviços", sale.valueAcresceFinancialService, { hideZero: true, extra: percentHint(sale.percentageAcresceService) })}
            ${sale.returnSituation && sale.returnSituation !== "SEM_DEVOLUCAO" ? `<tr><td>Devolução</td><td class="num">${enumLabel(sale.returnSituation)}</td></tr>` : ""}
            ${totalRow("Valor líquido", sale.valueLiquid, { strong: true })}
          </table>
        </div>
      </div>
    </section>

    <section class="block pad ops">
      Aberto por: ${text(sale.user?.userName || sale.userLegalName)}
      ${
        sale.userClosedService?.userName?.trim()
          ? ` · Encerrado por: ${text(sale.userClosedService.userName)}`
          : ""
      }
      <p class="terms">Autorizo a execução dos serviços e a aplicação das peças discriminados nesta ordem de serviço, ciente dos valores apresentados. Peças substituídas poderão ser descartadas após 15 dias se não forem retiradas.</p>
      <table class="signs">
        <tr>
          <td class="sign">
            <div class="sign-line"></div>
            Cliente / responsável
          </td>
          <td class="sign">
            <div class="sign-line"></div>
            Oficina / responsável técnico
          </td>
        </tr>
      </table>
    </section>
  </article>
  <div class="printed-at">Impresso em: ${escapeHtml(formatDateTime(printedAt))}</div>
  ${
    mode === "pdf"
      ? ""
      : `<script>
    if (new URLSearchParams(location.search).get("autoPrint") === "1") {
      window.addEventListener("load", function () { window.print(); });
    }
  </script>`
  }
</body>
</html>`;
};
