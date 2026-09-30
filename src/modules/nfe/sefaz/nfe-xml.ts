import { asNumber, type TaxNumber } from "../tax/calculate.js";

const NFE_XMLNS = "http://www.portalfiscal.inf.br/nfe";
const NFE_LAYOUT_VERSION = "4.00";

export const HOMOLOGATION_DEST_NAME =
  "NF-E EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";
export const HOMOLOGATION_ITEM_NAME =
  "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";

/** Em homologacao a SEFAZ exige o texto fixo no destinatario ou no primeiro item. */
export const applySefazHomologation = (
  document: NfeXmlDocument,
): NfeXmlDocument => {
  if (document.tpAmb !== 2) {
    return document;
  }
  if (document.dest) {
    return {
      ...document,
      dest: { ...document.dest, xNome: HOMOLOGATION_DEST_NAME },
    };
  }
  const [first, ...rest] = document.items;
  if (!first) {
    return document;
  }
  return {
    ...document,
    items: [{ ...first, xProd: HOMOLOGATION_ITEM_NAME }, ...rest],
  };
};

export type NfeXmlParty = {
  cnpj?: string | null;
  cpf?: string | null;
  xNome?: string | null;
  xFant?: string | null;
  ie?: string | null;
  isuf?: string | null;
  iest?: string | null;
  im?: string | null;
  cnae?: string | null;
  crt?: string | null;
  indIeDest?: string | null;
  email?: string | null;
  xlgr?: string | null;
  nro?: string | null;
  xcpl?: string | null;
  xbairro?: string | null;
  cmun?: string | null;
  xmun?: string | null;
  uf?: string | null;
  cep?: string | null;
  cpais?: string | null;
  xpais?: string | null;
  fone?: string | null;
};

export type NfeXmlItem = {
  nItem: number;
  cProd?: string | null;
  cEan?: string | null;
  xProd: string;
  ncm?: string | null;
  cBenef?: string | null;
  cfop?: string | null;
  uCom?: string | null;
  qCom?: TaxNumber;
  vUnCom?: TaxNumber;
  vProd?: TaxNumber;
  uTrib?: string | null;
  qTrib?: TaxNumber;
  vUnTrib?: TaxNumber;
  vDesc?: TaxNumber;
  vOutro?: TaxNumber;
  indTot?: string | null;
  icmsOrig?: string | null;
  icmsCst?: string | null;
  icmsCsosn?: string | null;
  icmsModBc?: string | null;
  icmsVBc?: TaxNumber;
  icmsPIcms?: TaxNumber;
  icmsVIcms?: TaxNumber;
  icmsPRedBc?: TaxNumber;
  icmsVIcmsDeson?: TaxNumber;
  icmsMotDesIcms?: string | null;
  icmsIndDeduzDeson?: string | null;
  icmsPFcp?: TaxNumber;
  icmsVFcp?: TaxNumber;
  icmsModBcSt?: string | null;
  icmsPMvaSt?: TaxNumber;
  icmsPRedBcSt?: TaxNumber;
  icmsVBcSt?: TaxNumber;
  icmsPIcmsSt?: TaxNumber;
  icmsVIcmsSt?: TaxNumber;
  icmsVBcUfDest?: TaxNumber;
  icmsVBcFcpUfDest?: TaxNumber;
  icmsPFcpUfDest?: TaxNumber;
  icmsPIcmsUfDest?: TaxNumber;
  icmsPIcmsInter?: TaxNumber;
  icmsPIcmsInterPart?: TaxNumber;
  icmsVFcpUfDest?: TaxNumber;
  icmsVIcmsUfDest?: TaxNumber;
  icmsVIcmsUfRemet?: TaxNumber;
  ipiCEnq?: string | null;
  ipiCst?: string | null;
  ipiVBc?: TaxNumber;
  ipiPIpi?: TaxNumber;
  ipiVIpi?: TaxNumber;
  pisCst?: string | null;
  pisVBc?: TaxNumber;
  pisPPis?: TaxNumber;
  pisVPis?: TaxNumber;
  cofinsCst?: string | null;
  cofinsVBc?: TaxNumber;
  cofinsPCofins?: TaxNumber;
  cofinsVCofins?: TaxNumber;
  ibsCbsCst?: string | null;
  ibsCbsCClassTrib?: string | null;
  ibsCbsVBc?: TaxNumber;
  ibsUfPIbs?: TaxNumber;
  ibsUfPRedAliq?: TaxNumber;
  ibsUfPAliqEfet?: TaxNumber;
  ibsUfVIbs?: TaxNumber;
  ibsMunPIbs?: TaxNumber;
  ibsMunPRedAliq?: TaxNumber;
  ibsMunPAliqEfet?: TaxNumber;
  ibsMunVIbs?: TaxNumber;
  ibsVIbs?: TaxNumber;
  cbsPCbs?: TaxNumber;
  cbsPRedAliq?: TaxNumber;
  cbsPAliqEfet?: TaxNumber;
  cbsVCbs?: TaxNumber;
  vTotTrib?: TaxNumber;
};

export type NfeXmlPayment = {
  indPag?: string | null;
  tPag?: string | null;
  xPag?: string | null;
  vPag?: TaxNumber;
  cardTpIntegra?: string | null;
  cardCnpj?: string | null;
  cardTBand?: string | null;
  cardCAut?: string | null;
};

export type NfeXmlDocument = {
  chave: string;
  cUf: string;
  cNf: string;
  natOp?: string | null;
  mod: string;
  serie: string;
  nNf: number;
  dhEmi: string;
  tpNf?: string | null;
  idDest?: string | null;
  cMunFg: number | string;
  tpImp?: string | null;
  tpEmis: number;
  cDv?: string | null;
  tpAmb: number;
  finNfe?: string | null;
  indFinal?: string | null;
  indPres?: string | null;
  procEmi?: string | null;
  verProc?: string | null;
  emit: NfeXmlParty;
  dest?: NfeXmlParty | null;
  items: NfeXmlItem[];
  payments: NfeXmlPayment[];
  vBc?: TaxNumber;
  vIcms?: TaxNumber;
  vIcmsDeson?: TaxNumber;
  vFcpUfDest?: TaxNumber;
  vIcmsUfDest?: TaxNumber;
  vIcmsUfRemet?: TaxNumber;
  vFcp?: TaxNumber;
  vBcSt?: TaxNumber;
  vSt?: TaxNumber;
  vFcpSt?: TaxNumber;
  vFcpStRet?: TaxNumber;
  vIi?: TaxNumber;
  vIpi?: TaxNumber;
  vIpiDevol?: TaxNumber;
  vProd?: TaxNumber;
  vFrete?: TaxNumber;
  vSeg?: TaxNumber;
  vDesc?: TaxNumber;
  vOutro?: TaxNumber;
  vPis?: TaxNumber;
  vCofins?: TaxNumber;
  vNf?: TaxNumber;
  vTotTrib?: TaxNumber;
  vBcIbsCbs?: TaxNumber;
  vIbsUf?: TaxNumber;
  vIbsMun?: TaxNumber;
  vIbs?: TaxNumber;
  vCbs?: TaxNumber;
  vNfTot?: TaxNumber;
  transport?: { modFrete: string; xNome?: string | null } | null;
  infCpl?: string | null;
  respTec?: {
    cnpj: string;
    xContato: string;
    email: string;
    fone: string;
  } | null;
};

const escapeXml = (value: string): string =>
  value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");

const SEFAZ_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}[+-](?:0\d|10|11):00$/;

/** Data da NF-e no fuso de Brasília, sem milissegundos e com deslocamento -03:00. */
export const formatSefazDateTime = (value: string | Date): string => {
  if (typeof value === "string" && SEFAZ_DATE_TIME.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return typeof value === "string" ? value : "";
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  const hour = pick("hour") === "24" ? "00" : pick("hour");
  return `${pick("year")}-${pick("month")}-${pick("day")}T${hour}:${pick("minute")}:${pick("second")}-03:00`;
};

const tag = (name: string, value: string | number | null | undefined): string => {
  if (value === null || value === undefined || value === "") return "";
  return `<${name}>${escapeXml(String(value))}</${name}>`;
};

const moneyTag = (name: string, value: TaxNumber): string => {
  if (value === null || value === undefined || value === "") return "";
  return tag(name, asNumber(value).toFixed(2));
};

const hasMoney = (value: TaxNumber): boolean =>
  value !== null && value !== undefined && value !== "";

const sumMoney = (values: TaxNumber[]): number =>
  values.reduce<number>(
    (sum, value) => sum + Math.round((asNumber(value) + Number.EPSILON) * 100),
    0,
  ) / 100;

const positiveMoneyTag = (name: string, value: TaxNumber): string =>
  asNumber(value) > 0 ? moneyTag(name, value) : "";

const qtyTag = (name: string, value: TaxNumber): string => {
  if (value === null || value === undefined || value === "") return "";
  return tag(name, asNumber(value).toFixed(4));
};

const address = (party: NfeXmlParty): string =>
  `<enderEmit>` +
  tag("xLgr", party.xlgr) +
  tag("nro", party.nro) +
  tag("xCpl", party.xcpl) +
  tag("xBairro", party.xbairro) +
  tag("cMun", party.cmun) +
  tag("xMun", party.xmun) +
  tag("UF", party.uf) +
  tag("CEP", party.cep) +
  tag("cPais", party.cpais) +
  tag("xPais", party.xpais) +
  tag("fone", party.fone) +
  `</enderEmit>`;

const destAddress = (party: NfeXmlParty): string =>
  address(party).replaceAll("enderEmit", "enderDest");

const desonXml = (item: NfeXmlItem): string =>
  asNumber(item.icmsVIcmsDeson) > 0
    ? moneyTag("vICMSDeson", item.icmsVIcmsDeson) +
      tag("motDesICMS", item.icmsMotDesIcms ?? "9") +
      tag("indDeduzDeson", item.icmsIndDeduzDeson ?? "0")
    : "";

const hasOwnIcms = (item: NfeXmlItem): boolean =>
  asNumber(item.icmsVBc) > 0 || asNumber(item.icmsPIcms) > 0;

const hasSt = (item: NfeXmlItem): boolean => asNumber(item.icmsVBcSt) > 0;

// pRedBC e obrigatorio no ICMS20/70 e opcional no ICMS51/90.
const ownIcmsXml = (item: NfeXmlItem, redBc: boolean | "optional" = false): string =>
  tag("modBC", item.icmsModBc ?? "3") +
  (redBc === true || (redBc === "optional" && asNumber(item.icmsPRedBc) > 0)
    ? qtyTag("pRedBC", item.icmsPRedBc ?? 0)
    : "") +
  moneyTag("vBC", item.icmsVBc ?? 0) +
  qtyTag("pICMS", item.icmsPIcms ?? 0) +
  moneyTag("vICMS", item.icmsVIcms ?? 0);

const fcpXml = (item: NfeXmlItem, withBase: boolean): string =>
  asNumber(item.icmsVFcp) > 0
    ? (withBase ? moneyTag("vBCFCP", item.icmsVBc ?? 0) : "") +
      qtyTag("pFCP", item.icmsPFcp) +
      moneyTag("vFCP", item.icmsVFcp)
    : "";

const stXml = (item: NfeXmlItem): string =>
  tag("modBCST", item.icmsModBcSt ?? "4") +
  (asNumber(item.icmsPMvaSt) > 0 ? qtyTag("pMVAST", item.icmsPMvaSt) : "") +
  (asNumber(item.icmsPRedBcSt) > 0 ? qtyTag("pRedBCST", item.icmsPRedBcSt) : "") +
  moneyTag("vBCST", item.icmsVBcSt ?? 0) +
  qtyTag("pICMSST", item.icmsPIcmsSt ?? 0) +
  moneyTag("vICMSST", item.icmsVIcmsSt ?? 0);

const icms = (item: NfeXmlItem): string => {
  if (item.icmsCsosn) {
    return (
      `<ICMSSN102>` +
      tag("orig", item.icmsOrig) +
      tag("CSOSN", item.icmsCsosn) +
      `</ICMSSN102>`
    );
  }
  const cst = item.icmsCst ?? "00";
  const head = tag("orig", item.icmsOrig ?? "0") + tag("CST", cst);
  const group = (name: string, body: string) => `<${name}>${head}${body}</${name}>`;
  switch (cst) {
    case "10":
      return group("ICMS10", ownIcmsXml(item) + fcpXml(item, true) + stXml(item));
    case "20":
      return group(
        "ICMS20",
        ownIcmsXml(item, true) + fcpXml(item, true) + desonXml(item),
      );
    case "30":
      return group("ICMS30", stXml(item) + desonXml(item));
    case "40":
    case "41":
    case "50":
      return group("ICMS40", desonXml(item));
    case "51":
      return group("ICMS51", hasOwnIcms(item) ? ownIcmsXml(item, "optional") : "");
    case "60":
      return group("ICMS60", "");
    case "70":
      return group(
        "ICMS70",
        ownIcmsXml(item, true) + fcpXml(item, true) + stXml(item) + desonXml(item),
      );
    case "90":
      return group(
        "ICMS90",
        (hasOwnIcms(item) ? ownIcmsXml(item, "optional") + fcpXml(item, true) : "") +
          (hasSt(item) ? stXml(item) : "") +
          desonXml(item),
      );
    default:
      return group("ICMS00", ownIcmsXml(item) + fcpXml(item, false));
  }
};

const hasDifal = (item: NfeXmlItem): boolean =>
  item.icmsPIcmsUfDest !== null &&
  item.icmsPIcmsUfDest !== undefined &&
  item.icmsPIcmsUfDest !== "";

const difalXml = (item: NfeXmlItem): string => {
  if (!hasDifal(item)) return "";
  const withFcp = asNumber(item.icmsPFcpUfDest) > 0;
  return (
    `<ICMSUFDest>` +
    moneyTag("vBCUFDest", item.icmsVBcUfDest ?? 0) +
    (withFcp ? moneyTag("vBCFCPUFDest", item.icmsVBcFcpUfDest ?? item.icmsVBcUfDest ?? 0) : "") +
    (withFcp ? qtyTag("pFCPUFDest", item.icmsPFcpUfDest) : "") +
    qtyTag("pICMSUFDest", item.icmsPIcmsUfDest) +
    qtyTag("pICMSInter", item.icmsPIcmsInter ?? 0) +
    qtyTag("pICMSInterPart", item.icmsPIcmsInterPart ?? 100) +
    (withFcp ? moneyTag("vFCPUFDest", item.icmsVFcpUfDest ?? 0) : "") +
    moneyTag("vICMSUFDest", item.icmsVIcmsUfDest ?? 0) +
    moneyTag("vICMSUFRemet", item.icmsVIcmsUfRemet ?? 0) +
    `</ICMSUFDest>`
  );
};

const hasIbsCbs = (item: NfeXmlItem): boolean =>
  Boolean(item.ibsCbsCst && item.ibsCbsCClassTrib);

const ibsCbsRateXml = (
  group: "gIBSUF" | "gIBSMun" | "gCBS",
  rateName: string,
  valueName: string,
  rate: TaxNumber,
  reduction: TaxNumber,
  effective: TaxNumber,
  value: TaxNumber,
): string =>
  `<${group}>` +
  qtyTag(rateName, rate ?? 0) +
  (asNumber(reduction) > 0
    ? `<gRed>${qtyTag("pRedAliq", reduction)}${qtyTag("pAliqEfet", effective ?? 0)}</gRed>`
    : "") +
  moneyTag(valueName, value ?? 0) +
  `</${group}>`;

const ibsCbsXml = (item: NfeXmlItem): string => {
  if (!hasIbsCbs(item)) return "";
  const hasBase =
    item.ibsCbsVBc !== null && item.ibsCbsVBc !== undefined && item.ibsCbsVBc !== "";
  return (
    `<IBSCBS>` +
    tag("CST", item.ibsCbsCst) +
    tag("cClassTrib", item.ibsCbsCClassTrib) +
    (hasBase
      ? `<gIBSCBS>` +
        moneyTag("vBC", item.ibsCbsVBc) +
        ibsCbsRateXml(
          "gIBSUF",
          "pIBSUF",
          "vIBSUF",
          item.ibsUfPIbs,
          item.ibsUfPRedAliq,
          item.ibsUfPAliqEfet,
          item.ibsUfVIbs,
        ) +
        ibsCbsRateXml(
          "gIBSMun",
          "pIBSMun",
          "vIBSMun",
          item.ibsMunPIbs,
          item.ibsMunPRedAliq,
          item.ibsMunPAliqEfet,
          item.ibsMunVIbs,
        ) +
        moneyTag("vIBS", item.ibsVIbs ?? 0) +
        ibsCbsRateXml(
          "gCBS",
          "pCBS",
          "vCBS",
          item.cbsPCbs,
          item.cbsPRedAliq,
          item.cbsPAliqEfet,
          item.cbsVCbs,
        ) +
        `</gIBSCBS>`
      : "") +
    `</IBSCBS>`
  );
};

const ibsCbsTotXml = (document: NfeXmlDocument): string => {
  if (!document.items.some(hasIbsCbs)) return "";
  const zero = moneyTag("vDif", 0) + moneyTag("vDevTrib", 0);
  const credPres = moneyTag("vCredPres", 0) + moneyTag("vCredPresCondSus", 0);
  return (
    `<IBSCBSTot>` +
    moneyTag("vBCIBSCBS", document.vBcIbsCbs ?? 0) +
    `<gIBS>` +
    `<gIBSUF>${zero}${moneyTag("vIBSUF", document.vIbsUf ?? 0)}</gIBSUF>` +
    `<gIBSMun>${zero}${moneyTag("vIBSMun", document.vIbsMun ?? 0)}</gIBSMun>` +
    moneyTag("vIBS", document.vIbs ?? 0) +
    credPres +
    `</gIBS>` +
    `<gCBS>${zero}${moneyTag("vCBS", document.vCbs ?? 0)}${credPres}</gCBS>` +
    `</IBSCBSTot>` +
    moneyTag("vNFTot", document.vNfTot ?? document.vNf ?? 0)
  );
};

const IPI_TRIB = new Set(["00", "49", "50", "99"]);

const ipiXml = (item: NfeXmlItem): string => {
  if (!item.ipiCst) return "";
  const body = IPI_TRIB.has(item.ipiCst)
    ? `<IPITrib>${tag("CST", item.ipiCst)}${moneyTag("vBC", item.ipiVBc ?? 0)}${qtyTag("pIPI", item.ipiPIpi ?? 0)}${moneyTag("vIPI", item.ipiVIpi ?? 0)}</IPITrib>`
    : `<IPINT>${tag("CST", item.ipiCst)}</IPINT>`;
  return `<IPI>${tag("cEnq", item.ipiCEnq ?? "999")}${body}</IPI>`;
};

const PIS_COFINS_NT = new Set(["04", "05", "06", "07", "08", "09"]);

const pisCofinsXml = (
  group: "PIS" | "COFINS",
  cst: string | null | undefined,
  vBc: TaxNumber,
  rate: TaxNumber,
  value: TaxNumber,
): string => {
  if (!cst) return "";
  if (PIS_COFINS_NT.has(cst)) {
    return `<${group}><${group}NT>${tag("CST", cst)}</${group}NT></${group}>`;
  }
  const kind = cst === "01" || cst === "02" ? "Aliq" : "Outr";
  return (
    `<${group}><${group}${kind}>` +
    tag("CST", cst) +
    moneyTag("vBC", vBc ?? 0) +
    qtyTag(`p${group}`, rate ?? 0) +
    moneyTag(`v${group}`, value ?? 0) +
    `</${group}${kind}></${group}>`
  );
};

const itemXml = (item: NfeXmlItem): string =>
  `<det nItem="${item.nItem}">` +
  `<prod>` +
  tag("cProd", item.cProd) +
  tag("cEAN", item.cEan ?? "SEM GTIN") +
  tag("xProd", item.xProd) +
  tag("NCM", item.ncm) +
  tag("cBenef", item.cBenef) +
  tag("CFOP", item.cfop) +
  tag("uCom", item.uCom) +
  qtyTag("qCom", item.qCom) +
  tag("vUnCom", item.vUnCom === undefined || item.vUnCom === null ? "" : asNumber(item.vUnCom).toFixed(10)) +
  moneyTag("vProd", item.vProd) +
  tag("cEANTrib", item.cEan ?? "SEM GTIN") +
  tag("uTrib", item.uTrib ?? item.uCom) +
  qtyTag("qTrib", item.qTrib ?? item.qCom) +
  tag("vUnTrib", item.vUnTrib === undefined || item.vUnTrib === null ? asNumber(item.vUnCom).toFixed(10) : asNumber(item.vUnTrib).toFixed(10)) +
  positiveMoneyTag("vDesc", item.vDesc) +
  positiveMoneyTag("vOutro", item.vOutro) +
  tag("indTot", item.indTot ?? "1") +
  `</prod>` +
  `<imposto>` +
  moneyTag("vTotTrib", item.vTotTrib) +
  `<ICMS>${icms(item)}</ICMS>` +
  ipiXml(item) +
  pisCofinsXml("PIS", item.pisCst, item.pisVBc, item.pisPPis, item.pisVPis) +
  pisCofinsXml(
    "COFINS",
    item.cofinsCst,
    item.cofinsVBc,
    item.cofinsPCofins,
    item.cofinsVCofins,
  ) +
  difalXml(item) +
  ibsCbsXml(item) +
  `</imposto>` +
  `</det>`;

const paymentXml = (payment: NfeXmlPayment): string =>
  `<detPag>` +
  tag("indPag", payment.indPag) +
  tag("tPag", payment.tPag) +
  tag("xPag", payment.xPag) +
  moneyTag("vPag", payment.vPag) +
  (payment.cardTpIntegra
    ? `<card>${tag("tpIntegra", payment.cardTpIntegra)}${tag("CNPJ", payment.cardCnpj)}${tag("tBand", payment.cardTBand)}${tag("cAut", payment.cardCAut)}</card>`
    : "") +
  `</detPag>`;

export const buildNfeXml = (input: NfeXmlDocument): string => {
  const source = applySefazHomologation(input);
  const informTotTrib =
    hasMoney(source.vTotTrib) ||
    source.items.some((item) => hasMoney(item.vTotTrib));
  const items = informTotTrib
    ? source.items.map((item) => ({ ...item, vTotTrib: item.vTotTrib ?? 0 }))
    : source.items;
  const document = {
    ...source,
    items,
    vTotTrib: informTotTrib
      ? sumMoney(items.map((item) => item.vTotTrib))
      : source.vTotTrib,
  };
  const emit = document.emit;
  const dest = document.dest;
  const transport =
    document.mod === "65"
      ? `<transp>${tag("modFrete", "9")}</transp>`
      : !document.transport
        ? ""
        : `<transp>${tag("modFrete", document.transport.modFrete)}${
            document.transport.xNome
              ? `<transporta>${tag("xNome", document.transport.xNome)}</transporta>`
              : ""
          }</transp>`;

  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<NFe xmlns="${NFE_XMLNS}">` +
    `<infNFe versao="${NFE_LAYOUT_VERSION}" Id="NFe${document.chave}">` +
    `<ide>` +
    tag("cUF", document.cUf) +
    tag("cNF", document.cNf) +
    tag("natOp", document.natOp) +
    tag("mod", document.mod) +
    tag("serie", document.serie) +
    tag("nNF", document.nNf) +
    tag("dhEmi", formatSefazDateTime(document.dhEmi)) +
    tag("tpNF", document.tpNf) +
    tag("idDest", document.idDest) +
    tag("cMunFG", document.cMunFg) +
    tag("tpImp", document.tpImp) +
    tag("tpEmis", document.tpEmis) +
    tag("cDV", document.cDv) +
    tag("tpAmb", document.tpAmb) +
    tag("finNFe", document.finNfe) +
    tag("indFinal", document.indFinal) +
    tag("indPres", document.indPres) +
    tag("procEmi", document.procEmi) +
    tag("verProc", document.verProc) +
    `</ide>` +
    `<emit>` +
    tag("CNPJ", emit.cnpj) +
    tag("CPF", emit.cpf) +
    tag("xNome", emit.xNome) +
    tag("xFant", emit.xFant) +
    address(emit) +
    tag("IE", emit.ie) +
    tag("CRT", emit.crt) +
    `</emit>` +
    (dest
      ? `<dest>${tag("CNPJ", dest.cnpj)}${tag("CPF", dest.cpf)}${tag("xNome", dest.xNome)}${destAddress(dest)}${tag("indIEDest", dest.indIeDest)}${tag("IE", dest.ie)}${tag("ISUF", dest.isuf)}${tag("email", dest.email)}</dest>`
      : "") +
    document.items.map(itemXml).join("") +
    `<total><ICMSTot>` +
    moneyTag("vBC", document.vBc ?? 0) +
    moneyTag("vICMS", document.vIcms ?? 0) +
    moneyTag("vICMSDeson", document.vIcmsDeson ?? 0) +
    (document.items.some(hasDifal)
      ? moneyTag("vFCPUFDest", document.vFcpUfDest ?? 0) +
        moneyTag("vICMSUFDest", document.vIcmsUfDest ?? 0) +
        moneyTag("vICMSUFRemet", document.vIcmsUfRemet ?? 0)
      : "") +
    moneyTag("vFCP", document.vFcp ?? 0) +
    moneyTag("vBCST", document.vBcSt ?? 0) +
    moneyTag("vST", document.vSt ?? 0) +
    moneyTag("vFCPST", document.vFcpSt ?? 0) +
    moneyTag("vFCPSTRet", document.vFcpStRet ?? 0) +
    moneyTag("vProd", document.vProd ?? 0) +
    moneyTag("vFrete", document.vFrete ?? 0) +
    moneyTag("vSeg", document.vSeg ?? 0) +
    moneyTag("vDesc", document.vDesc ?? 0) +
    moneyTag("vII", document.vIi ?? 0) +
    moneyTag("vIPI", document.vIpi ?? 0) +
    moneyTag("vIPIDevol", document.vIpiDevol ?? 0) +
    moneyTag("vPIS", document.vPis ?? 0) +
    moneyTag("vCOFINS", document.vCofins ?? 0) +
    moneyTag("vOutro", document.vOutro ?? 0) +
    moneyTag("vNF", document.vNf ?? 0) +
    moneyTag("vTotTrib", document.vTotTrib) +
    `</ICMSTot>` +
    ibsCbsTotXml(document) +
    `</total>` +
    transport +
    `<pag>${document.payments.map(paymentXml).join("")}</pag>` +
    (document.infCpl ? `<infAdic>${tag("infCpl", document.infCpl)}</infAdic>` : "") +
    (document.respTec
      ? `<infRespTec>${tag("CNPJ", document.respTec.cnpj)}${tag("xContato", document.respTec.xContato)}${tag("email", document.respTec.email)}${tag("fone", document.respTec.fone)}</infRespTec>`
      : "") +
    `</infNFe></NFe>`
  );
};
