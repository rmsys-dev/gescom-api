import { XMLParser } from "fast-xml-parser";
import { BadRequestError } from "../../../shared/errors/app-error.js";
import { asRecord, textOf } from "../sefaz/soap-parse.js";
import { parseProcNFeCompra } from "./proc-nfe.js";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
  isArray: (tagName) => tagName === "det" || tagName === "dup",
});

export type EntradaImposto = {
  icmsGrupo: string | null;
  icmsOrig: string | null;
  icmsCst: string | null;
  icmsCsosn: string | null;
  icmsModBc: string | null;
  icmsVBc: string | null;
  icmsPIcms: string | null;
  icmsVIcms: string | null;
  icmsPFcp: string | null;
  icmsVFcp: string | null;
  icmsPRedBc: string | null;
  icmsVIcmsDeson: string | null;
  icmsMotDesIcms: string | null;
  icmsIndDeduzDeson: string | null;
  icmsModBcSt: string | null;
  icmsPMvaSt: string | null;
  icmsPRedBcSt: string | null;
  icmsVBcSt: string | null;
  icmsPIcmsSt: string | null;
  icmsVIcmsSt: string | null;
  icmsVBcFcpSt: string | null;
  icmsPFcpSt: string | null;
  icmsVFcpSt: string | null;
  icmsVBcFcpStRet: string | null;
  icmsPFcpStRet: string | null;
  icmsVFcpStRet: string | null;
  ipiCst: string | null;
  ipiCEnq: string | null;
  ipiVBc: string | null;
  ipiPIpi: string | null;
  ipiVIpi: string | null;
  pisGrupo: string | null;
  pisCst: string | null;
  pisVBc: string | null;
  pisPPis: string | null;
  pisVPis: string | null;
  cofinsGrupo: string | null;
  cofinsCst: string | null;
  cofinsVBc: string | null;
  cofinsPCofins: string | null;
  cofinsVCofins: string | null;
  iiVIi: string | null;
  vIpiDevol: string | null;
  vTotTrib: string | null;
  ibsCbsCst: string | null;
  ibsCbsCClassTrib: string | null;
  ibsCbsVBc: string | null;
  ibsUfPIbs: string | null;
  ibsUfVIbs: string | null;
  ibsMunPIbs: string | null;
  ibsMunVIbs: string | null;
  ibsVIbs: string | null;
  cbsPCbs: string | null;
  cbsVCbs: string | null;
  isCst: string | null;
  isCClassTrib: string | null;
  isVBc: string | null;
  isPIs: string | null;
  isVIs: string | null;
};

export type EntradaItemXml = {
  nItem: number;
  cProd: string | null;
  cEan: string | null;
  xProd: string;
  ncm: string | null;
  cest: string | null;
  cfop: string | null;
  uCom: string | null;
  qCom: string | null;
  vUnCom: string | null;
  vProd: string | null;
  uTrib: string | null;
  qTrib: string | null;
  vUnTrib: string | null;
  vFrete: string | null;
  vSeg: string | null;
  vDesc: string | null;
  vOutro: string | null;
  indTot: string;
  imposto: EntradaImposto;
};

export type EntradaTotais = {
  vBc: string | null;
  vIcms: string | null;
  vIcmsDeson: string | null;
  vFcp: string | null;
  vBcSt: string | null;
  vSt: string | null;
  vFcpSt: string | null;
  vFcpStRet: string | null;
  vProd: string | null;
  vFrete: string | null;
  vSeg: string | null;
  vDesc: string | null;
  vIi: string | null;
  vIpi: string | null;
  vIpiDevol: string | null;
  vPis: string | null;
  vCofins: string | null;
  vOutro: string | null;
  vNf: string | null;
  vTotTrib: string | null;
  vIs: string | null;
  vBcIbsCbs: string | null;
  vIbsUf: string | null;
  vIbsMun: string | null;
  vIbs: string | null;
  vCbs: string | null;
  issqnVServ: string | null;
  nFat: string | null;
  vOrig: string | null;
  cobrVDesc: string | null;
  vLiq: string | null;
};

export type EntradaDuplicata = {
  nDup: string;
  dVenc: string;
  vDup: string;
};

export type EntradaEmitente = {
  nome: string | null;
  fantasia: string | null;
  ie: string | null;
  im: string | null;
  fone: string | null;
  cep: string | null;
  logradouro: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  codigoMunicipio: string | null;
  municipio: string | null;
  uf: string | null;
};

export type EntradaProcNFe = {
  chave: string;
  nNf: number;
  serie: string;
  dhEmi: Date;
  emitCnpj: string;
  emitCpf: string | null;
  emitXNome: string | null;
  emitente: EntradaEmitente;
  itens: EntradaItemXml[];
  totais: EntradaTotais;
  duplicatas: EntradaDuplicata[];
};

const clip = (value: string | undefined, max: number): string | null => {
  const text = value?.trim();
  if (!text) return null;
  return text.slice(0, max);
};

const decimal = (value: string | undefined, scale: number): string | null => {
  const text = value?.trim().replace(",", ".");
  if (!text || !/^-?\d+(\.\d+)?$/.test(text)) return null;
  const negative = text.startsWith("-");
  const raw = negative ? text.slice(1) : text;
  const [whole, fraction = ""] = raw.split(".");
  const formatted = `${whole}.${fraction.padEnd(scale, "0").slice(0, scale)}`;
  return negative ? `-${formatted}` : formatted;
};

const money = (value: string | undefined): string | null => decimal(value, 2);
const rate = (value: string | undefined): string | null => decimal(value, 4);
const qty = (value: string | undefined): string | null => decimal(value, 4);

const records = (value: unknown): Record<string, unknown>[] => {
  if (Array.isArray(value)) {
    return value.flatMap((item) => {
      const record = asRecord(item);
      return record ? [record] : [];
    });
  }
  const record = asRecord(value);
  return record ? [record] : [];
};

const firstChild = (
  node: Record<string, unknown> | undefined,
): { nome: string; dados: Record<string, unknown> } | null => {
  if (!node) return null;
  for (const [nome, valor] of Object.entries(node)) {
    if (nome.startsWith("@_") || nome === "#text") continue;
    const dados = asRecord(valor);
    if (dados) return { nome, dados };
  }
  return null;
};

const impostoVazio = (): EntradaImposto => ({
  icmsGrupo: null,
  icmsOrig: null,
  icmsCst: null,
  icmsCsosn: null,
  icmsModBc: null,
  icmsVBc: null,
  icmsPIcms: null,
  icmsVIcms: null,
  icmsPFcp: null,
  icmsVFcp: null,
  icmsPRedBc: null,
  icmsVIcmsDeson: null,
  icmsMotDesIcms: null,
  icmsIndDeduzDeson: null,
  icmsModBcSt: null,
  icmsPMvaSt: null,
  icmsPRedBcSt: null,
  icmsVBcSt: null,
  icmsPIcmsSt: null,
  icmsVIcmsSt: null,
  icmsVBcFcpSt: null,
  icmsPFcpSt: null,
  icmsVFcpSt: null,
  icmsVBcFcpStRet: null,
  icmsPFcpStRet: null,
  icmsVFcpStRet: null,
  ipiCst: null,
  ipiCEnq: null,
  ipiVBc: null,
  ipiPIpi: null,
  ipiVIpi: null,
  pisGrupo: null,
  pisCst: null,
  pisVBc: null,
  pisPPis: null,
  pisVPis: null,
  cofinsGrupo: null,
  cofinsCst: null,
  cofinsVBc: null,
  cofinsPCofins: null,
  cofinsVCofins: null,
  iiVIi: null,
  vIpiDevol: null,
  vTotTrib: null,
  ibsCbsCst: null,
  ibsCbsCClassTrib: null,
  ibsCbsVBc: null,
  ibsUfPIbs: null,
  ibsUfVIbs: null,
  ibsMunPIbs: null,
  ibsMunVIbs: null,
  ibsVIbs: null,
  cbsPCbs: null,
  cbsVCbs: null,
  isCst: null,
  isCClassTrib: null,
  isVBc: null,
  isPIs: null,
  isVIs: null,
});

const lerIcms = (
  imposto: Record<string, unknown> | undefined,
  tax: EntradaImposto,
): void => {
  const icms = asRecord(imposto?.ICMS);
  const grupo = firstChild(icms);
  if (!grupo) return;
  tax.icmsGrupo = grupo.nome.slice(0, 20);
  const dados = grupo.dados;
  tax.icmsOrig = clip(textOf(dados.orig), 1);
  tax.icmsCst = clip(textOf(dados.CST), 2);
  tax.icmsCsosn = clip(textOf(dados.CSOSN), 3);
  tax.icmsModBc = clip(textOf(dados.modBC), 1);
  tax.icmsVBc = money(textOf(dados.vBC));
  tax.icmsPIcms = rate(textOf(dados.pICMS));
  tax.icmsVIcms = money(textOf(dados.vICMS));
  tax.icmsPFcp = rate(textOf(dados.pFCP));
  tax.icmsVFcp = money(textOf(dados.vFCP));
  tax.icmsPRedBc = rate(textOf(dados.pRedBC));
  tax.icmsVIcmsDeson = money(textOf(dados.vICMSDeson));
  tax.icmsMotDesIcms = clip(textOf(dados.motDesICMS), 2);
  tax.icmsIndDeduzDeson = clip(textOf(dados.indDeduzDeson), 1);
  tax.icmsModBcSt = clip(textOf(dados.modBCST), 1);
  tax.icmsPMvaSt = rate(textOf(dados.pMVAST));
  tax.icmsPRedBcSt = rate(textOf(dados.pRedBCST));
  tax.icmsVBcSt = money(textOf(dados.vBCST));
  tax.icmsPIcmsSt = rate(textOf(dados.pICMSST));
  tax.icmsVIcmsSt = money(textOf(dados.vICMSST));
  tax.icmsVBcFcpSt = money(textOf(dados.vBCFCPST));
  tax.icmsPFcpSt = rate(textOf(dados.pFCPST));
  tax.icmsVFcpSt = money(textOf(dados.vFCPST));
  tax.icmsVBcFcpStRet = money(textOf(dados.vBCFCPSTRet));
  tax.icmsPFcpStRet = rate(textOf(dados.pFCPSTRet));
  tax.icmsVFcpStRet = money(textOf(dados.vFCPSTRet));
};

const lerIpi = (
  imposto: Record<string, unknown> | undefined,
  tax: EntradaImposto,
): void => {
  const ipi = asRecord(imposto?.IPI);
  if (!ipi) return;
  tax.ipiCEnq = clip(textOf(ipi.cEnq), 3);
  const grupo = firstChild(ipi);
  if (!grupo) return;
  tax.ipiCst = clip(textOf(grupo.dados.CST), 2);
  tax.ipiVBc = money(textOf(grupo.dados.vBC));
  tax.ipiPIpi = rate(textOf(grupo.dados.pIPI));
  tax.ipiVIpi = money(textOf(grupo.dados.vIPI));
};

const lerPisCofins = (
  node: Record<string, unknown> | undefined,
  tax: EntradaImposto,
  tipo: "pis" | "cofins",
): void => {
  const grupo = firstChild(node);
  if (!grupo) return;
  if (tipo === "pis") {
    tax.pisGrupo = grupo.nome.slice(0, 20);
    tax.pisCst = clip(textOf(grupo.dados.CST), 2);
    tax.pisVBc = money(textOf(grupo.dados.vBC));
    tax.pisPPis = rate(textOf(grupo.dados.pPIS));
    tax.pisVPis = money(textOf(grupo.dados.vPIS));
    return;
  }
  tax.cofinsGrupo = grupo.nome.slice(0, 20);
  tax.cofinsCst = clip(textOf(grupo.dados.CST), 2);
  tax.cofinsVBc = money(textOf(grupo.dados.vBC));
  tax.cofinsPCofins = rate(textOf(grupo.dados.pCOFINS));
  tax.cofinsVCofins = money(textOf(grupo.dados.vCOFINS));
};

const lerIbs = (
  imposto: Record<string, unknown> | undefined,
  tax: EntradaImposto,
): void => {
  const ibs = asRecord(imposto?.IBSCBS);
  if (!ibs) return;
  tax.ibsCbsCst = clip(textOf(ibs.CST), 3);
  tax.ibsCbsCClassTrib = clip(textOf(ibs.cClassTrib), 6);
  const grupo = asRecord(ibs.gIBSCBS);
  if (!grupo) return;
  tax.ibsCbsVBc = money(textOf(grupo.vBC));
  const uf = asRecord(grupo.gIBSUF);
  const mun = asRecord(grupo.gIBSMun);
  const cbs = asRecord(grupo.gCBS);
  tax.ibsUfPIbs = rate(textOf(uf?.pIBSUF));
  tax.ibsUfVIbs = money(textOf(uf?.vIBSUF));
  tax.ibsMunPIbs = rate(textOf(mun?.pIBSMun));
  tax.ibsMunVIbs = money(textOf(mun?.vIBSMun));
  tax.ibsVIbs = money(textOf(grupo.vIBS));
  tax.cbsPCbs = rate(textOf(cbs?.pCBS));
  tax.cbsVCbs = money(textOf(cbs?.vCBS));
  const is = asRecord(imposto?.IS);
  if (!is) return;
  tax.isCst = clip(textOf(is.CSTIS), 3);
  tax.isCClassTrib = clip(textOf(is.cClassTribIS), 6);
  tax.isVBc = money(textOf(is.vBCIS));
  tax.isPIs = rate(textOf(is.pIS));
  tax.isVIs = money(textOf(is.vIS));
};

const lerItem = (det: Record<string, unknown>): EntradaItemXml => {
  const prod = asRecord(det.prod);
  const impostoNode = asRecord(det.imposto);
  const nItem = Number(textOf(det["@_nItem"]));
  const xProd = clip(textOf(prod?.xProd), 120);
  if (!Number.isInteger(nItem) || nItem < 1 || !xProd) {
    throw new BadRequestError(
      "Item do procNFe sem numero ou descricao",
      "NFE_ENTRADA_XML_INVALID",
    );
  }
  const imposto = impostoVazio();
  imposto.vTotTrib = money(textOf(impostoNode?.vTotTrib));
  lerIcms(impostoNode, imposto);
  lerIpi(impostoNode, imposto);
  lerPisCofins(asRecord(impostoNode?.PIS), imposto, "pis");
  lerPisCofins(asRecord(impostoNode?.COFINS), imposto, "cofins");
  imposto.iiVIi = money(textOf(asRecord(impostoNode?.II)?.vII));
  imposto.vIpiDevol = money(textOf(asRecord(det.impostoDevol)?.vIPIDevol));
  lerIbs(impostoNode, imposto);
  return {
    nItem,
    cProd: clip(textOf(prod?.cProd), 60),
    cEan: clip(textOf(prod?.cEAN), 14),
    xProd,
    ncm: clip(textOf(prod?.NCM), 8),
    cest: clip(textOf(prod?.CEST), 7),
    cfop: clip(textOf(prod?.CFOP), 4),
    uCom: clip(textOf(prod?.uCom), 6),
    qCom: qty(textOf(prod?.qCom)),
    vUnCom: decimal(textOf(prod?.vUnCom), 10),
    vProd: money(textOf(prod?.vProd)),
    uTrib: clip(textOf(prod?.uTrib), 6),
    qTrib: qty(textOf(prod?.qTrib)),
    vUnTrib: decimal(textOf(prod?.vUnTrib), 10),
    vFrete: money(textOf(prod?.vFrete)),
    vSeg: money(textOf(prod?.vSeg)),
    vDesc: money(textOf(prod?.vDesc)),
    vOutro: money(textOf(prod?.vOutro)),
    indTot: clip(textOf(prod?.indTot), 1) ?? "1",
    imposto,
  };
};

const lerTotais = (infNFe: Record<string, unknown> | undefined): EntradaTotais => {
  const total = asRecord(infNFe?.total);
  const icms = asRecord(total?.ICMSTot);
  const ibs = asRecord(total?.IBSCBSTot);
  const issqn = asRecord(total?.ISSQNtot);
  const is = asRecord(total?.ISTot);
  const cobr = asRecord(infNFe?.cobr);
  const fat = asRecord(cobr?.fat);
  return {
    vBc: money(textOf(icms?.vBC)),
    vIcms: money(textOf(icms?.vICMS)),
    vIcmsDeson: money(textOf(icms?.vICMSDeson)),
    vFcp: money(textOf(icms?.vFCP)),
    vBcSt: money(textOf(icms?.vBCST)),
    vSt: money(textOf(icms?.vST)),
    vFcpSt: money(textOf(icms?.vFCPST)),
    vFcpStRet: money(textOf(icms?.vFCPSTRet)),
    vProd: money(textOf(icms?.vProd)),
    vFrete: money(textOf(icms?.vFrete)),
    vSeg: money(textOf(icms?.vSeg)),
    vDesc: money(textOf(icms?.vDesc)),
    vIi: money(textOf(icms?.vII)),
    vIpi: money(textOf(icms?.vIPI)),
    vIpiDevol: money(textOf(icms?.vIPIDevol)),
    vPis: money(textOf(icms?.vPIS)),
    vCofins: money(textOf(icms?.vCOFINS)),
    vOutro: money(textOf(icms?.vOutro)),
    vNf: money(textOf(icms?.vNF)),
    vTotTrib: money(textOf(icms?.vTotTrib)),
    vIs: money(textOf(is?.vIS)),
    vBcIbsCbs: money(textOf(ibs?.vBCIBSCBS)),
    vIbsUf: money(textOf(asRecord(asRecord(ibs?.gIBS)?.gIBSUF)?.vIBSUF ?? ibs?.vIBSUF)),
    vIbsMun: money(textOf(asRecord(asRecord(ibs?.gIBS)?.gIBSMun)?.vIBSMun ?? ibs?.vIBSMun)),
    vIbs: money(textOf(asRecord(ibs?.gIBS)?.vIBS ?? ibs?.vIBS)),
    vCbs: money(textOf(asRecord(ibs?.gCBS)?.vCBS ?? ibs?.vCBS)),
    issqnVServ: money(textOf(issqn?.vServ)),
    nFat: clip(textOf(fat?.nFat), 60),
    vOrig: money(textOf(fat?.vOrig)),
    cobrVDesc: money(textOf(fat?.vDesc)),
    vLiq: money(textOf(fat?.vLiq)),
  };
};

const digitos = (value: string | undefined, max: number): string | null => {
  const text = (value ?? "").replace(/\D/g, "");
  return text ? text.slice(0, max) : null;
};

const lerEmitente = (
  infNFe: Record<string, unknown> | undefined,
): EntradaEmitente => {
  const emit = asRecord(infNFe?.emit);
  const endereco = asRecord(emit?.enderEmit);
  const cep = digitos(textOf(endereco?.CEP), 8);
  const municipio = digitos(textOf(endereco?.cMun), 7);
  return {
    nome: clip(textOf(emit?.xNome), 255),
    fantasia: clip(textOf(emit?.xFant), 255),
    ie: clip(textOf(emit?.IE), 255),
    im: clip(textOf(emit?.IM), 255),
    fone: digitos(textOf(endereco?.fone), 20),
    cep: cep?.length === 8 ? cep : null,
    logradouro: clip(textOf(endereco?.xLgr), 255),
    numero: clip(textOf(endereco?.nro), 255),
    complemento: clip(textOf(endereco?.xCpl), 255),
    bairro: clip(textOf(endereco?.xBairro), 255),
    codigoMunicipio: municipio?.length === 7 ? municipio : null,
    municipio: clip(textOf(endereco?.xMun), 255),
    uf: clip(textOf(endereco?.UF), 2),
  };
};

const lerDuplicatas = (
  infNFe: Record<string, unknown> | undefined,
): EntradaDuplicata[] => {
  const cobr = asRecord(infNFe?.cobr);
  return records(cobr?.dup).flatMap((dup) => {
    const nDup = clip(textOf(dup.nDup), 60);
    const dVenc = clip(textOf(dup.dVenc), 10);
    const vDup = money(textOf(dup.vDup));
    if (!nDup || !dVenc || !vDup || !/^\d{4}-\d{2}-\d{2}$/.test(dVenc)) {
      return [];
    }
    return [{ nDup, dVenc, vDup }];
  });
};

export const parseEntradaProcNFe = (xml: string): EntradaProcNFe => {
  const capa = parseProcNFeCompra(xml);
  const nfeProc = asRecord(asRecord(parser.parse(xml))?.nfeProc);
  const nota =
    asRecord(asRecord(nfeProc?.NFe)?.infNFe) ?? asRecord(nfeProc?.infNFe);
  const itens = records(nota?.det).map(lerItem);
  if (itens.length === 0) {
    throw new BadRequestError(
      "O procNFe nao tem itens para lancar",
      "NFE_ENTRADA_SEM_ITENS",
    );
  }
  return {
    chave: capa.chave,
    nNf: capa.nNf,
    serie: capa.serie,
    dhEmi: capa.dhEmi,
    emitCnpj: capa.emitCnpj,
    emitCpf: capa.emitCpf,
    emitXNome: capa.emitXNome,
    emitente: lerEmitente(nota),
    itens,
    totais: lerTotais(nota),
    duplicatas: lerDuplicatas(nota),
  };
};
