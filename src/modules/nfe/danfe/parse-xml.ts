import { XMLParser } from "fast-xml-parser";

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  trimValues: true,
  parseTagValue: false,
});

export type DanfeParty = {
  name: string;
  fantasy: string;
  document: string;
  ie: string;
  iest: string;
  indIeDest: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  uf: string;
  cep: string;
  phone: string;
  email: string;
  crt: string;
  im: string;
};

export type DanfeItem = {
  nItem: string;
  cProd: string;
  xProd: string;
  ncm: string;
  orig: string;
  cst: string;
  vTotTrib: string;
  cfop: string;
  uCom: string;
  qCom: string;
  vUnCom: string;
  vProd: string;
  vBc: string;
  vIcms: string;
  pIcms: string;
  vBcIpi: string;
  vIpi: string;
  pIpi: string;
  vIbs: string;
  vCbs: string;
  infAdProd: string;
  cstIbsCbs: string;
  cClassTrib: string;
  vBcIbsCbs: string;
  pIbsUf: string;
  vIbsUf: string;
  pIbsMun: string;
  vIbsMun: string;
  pCbs: string;
  vBcIs: string;
  pIs: string;
  vIs: string;
};

export type DanfeIssqn = {
  vServ: string;
  vBc: string;
  vIss: string;
};

export type DanfeDuplicate = {
  nDup: string;
  dVenc: string;
  vDup: string;
};

export type DanfeVolume = {
  qVol: string;
  esp: string;
  marca: string;
  nVol: string;
  pesoL: string;
  pesoB: string;
};

export type DanfePayment = {
  indPag: string;
  tPag: string;
  xPag: string;
  vPag: string;
};

export type DanfeModel = {
  authorized: boolean;
  chave: string;
  protocol: string;
  receivedAt: string;
  /** Conteúdo de infNFeSupl/qrCode, quando a nota traz o grupo. */
  qrCode: string;
  /** infNFeSupl/urlChave (NFC-e): endereço de consulta pela chave. */
  urlChave: string;
  mod: string;
  tpEmis: string;
  natOp: string;
  serie: string;
  nNf: string;
  dhEmi: string;
  dhSaiEnt: string;
  tpNf: string;
  tpAmb: string;
  emit: DanfeParty;
  dest: DanfeParty | null;
  retirada: DanfeParty | null;
  entrega: DanfeParty | null;
  items: DanfeItem[];
  totals: {
    vBc: string;
    vIcms: string;
    vBcSt: string;
    vSt: string;
    vProd: string;
    vFrete: string;
    vSeg: string;
    vDesc: string;
    vOutro: string;
    vIpi: string;
    vNf: string;
    vFcp: string;
    vFcpSt: string;
    vIcmsUfDest: string;
    vFcpUfDest: string;
    qBcMono: string;
    vIcmsMono: string;
    qBcMonoReten: string;
    vIcmsMonoReten: string;
    vTotTrib: string;
    vIbs: string;
    vIbsUf: string;
    vIbsMun: string;
    vCbs: string;
    vIs: string;
    hasIbsCbs: boolean;
    mono: {
      vIbsMono: string;
      vCbsMono: string;
      vIbsMonoReten: string;
      vCbsMonoReten: string;
    } | null;
    issqn: DanfeIssqn | null;
  };
  modFrete: string;
  carrierName: string;
  carrierDocument: string;
  carrierIe: string;
  carrierAddress: string;
  carrierCity: string;
  carrierUf: string;
  vehiclePlate: string;
  vehicleUf: string;
  volumes: DanfeVolume[];
  invoiceNumber: string;
  invoiceOriginal: string;
  invoiceDiscount: string;
  invoiceNet: string;
  duplicates: DanfeDuplicate[];
  payments: DanfePayment[];
  vTroco: string;
  infCpl: string;
  infAdFisco: string;
};

const emptyParty = (): DanfeParty => ({
  name: "",
  fantasy: "",
  document: "",
  ie: "",
  iest: "",
  indIeDest: "",
  street: "",
  number: "",
  complement: "",
  neighborhood: "",
  city: "",
  uf: "",
  cep: "",
  phone: "",
  email: "",
  crt: "",
  im: "",
});

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
};

const asList = (value: unknown): Record<string, unknown>[] => {
  if (value == null) return [];
  const rows = Array.isArray(value) ? value : [value];
  return rows.flatMap((row) => {
    const record = asRecord(row);
    return record ? [record] : [];
  });
};

const text = (value: unknown): string => {
  if (value == null) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return String(value).trim();
  }
  const record = asRecord(value);
  return record ? text(record["#text"]) : "";
};

const findInfNFe = (node: unknown): Record<string, unknown> | null => {
  const root = asRecord(node);
  if (!root) return null;
  const inf = asRecord(root.infNFe);
  if (inf) return inf;
  if (root.NFe) return findInfNFe(root.NFe);
  if (root.nfeProc) return findInfNFe(root.nfeProc);
  return null;
};

const findSupl = (node: unknown): Record<string, unknown> | null => {
  const root = asRecord(node);
  if (!root) return null;
  const supl = asRecord(root.infNFeSupl);
  if (supl) return supl;
  if (root.NFe) return findSupl(root.NFe);
  if (root.nfeProc) return findSupl(root.nfeProc);
  return null;
};

const findProtocol = (node: unknown): Record<string, unknown> | null => {
  const root = asRecord(node);
  if (!root) return null;
  const proc = asRecord(root.nfeProc) ?? (root.protNFe ? root : null);
  const prot = asRecord(proc?.protNFe);
  return asRecord(prot?.infProt);
};

const partyFrom = (node: unknown, addressKey?: string): DanfeParty | null => {
  const row = asRecord(node);
  if (!row) return null;
  const place = (addressKey ? asRecord(row[addressKey]) : null) ?? row;
  const party = emptyParty();
  party.name = text(row.xNome);
  party.fantasy = text(row.xFant);
  party.document = text(row.CNPJ) || text(row.CPF);
  party.ie = text(row.IE);
  party.iest = text(row.IEST);
  party.indIeDest = text(row.indIEDest);
  party.street = text(place.xLgr);
  party.number = text(place.nro);
  party.complement = text(place.xCpl);
  party.neighborhood = text(place.xBairro);
  party.city = text(place.xMun);
  party.uf = text(place.UF);
  party.cep = text(place.CEP);
  party.phone = text(place.fone) || text(row.fone);
  party.email = text(row.email);
  party.crt = text(row.CRT);
  party.im = text(row.IM);
  const filled = Object.values(party).some((value) => value !== "");
  return filled ? party : null;
};

const icmsOf = (imposto: Record<string, unknown> | null) => {
  const icms = asRecord(imposto?.ICMS);
  const group = icms ? Object.values(icms).map(asRecord).find((row) => row !== null) : null;
  return {
    orig: text(group?.orig),
    cst: text(group?.CST) || text(group?.CSOSN),
    vBc: text(group?.vBC),
    vIcms: text(group?.vICMS),
    pIcms: text(group?.pICMS),
  };
};

const ipiOf = (imposto: Record<string, unknown> | null) => {
  const trib = asRecord(asRecord(imposto?.IPI)?.IPITrib);
  return { vBcIpi: text(trib?.vBC), vIpi: text(trib?.vIPI), pIpi: text(trib?.pIPI) };
};

/** Com gRed (redução ou compra governamental) a NT 2026.010 manda imprimir a alíquota efetiva. */
const rateOf = (group: Record<string, unknown> | null, rateName: string) => {
  const reduction = asRecord(group?.gRed);
  return reduction ? text(reduction.pAliqEfet) : text(group?.[rateName]);
};

const ibsOf = (imposto: Record<string, unknown> | null) => {
  const root = asRecord(imposto?.IBSCBS);
  const group = asRecord(root?.gIBSCBS);
  const uf = asRecord(group?.gIBSUF);
  const mun = asRecord(group?.gIBSMun);
  const cbs = asRecord(group?.gCBS);
  return {
    cstIbsCbs: text(root?.CST),
    cClassTrib: text(root?.cClassTrib),
    vBcIbsCbs: text(group?.vBC),
    vIbs: text(group?.vIBS),
    pIbsUf: rateOf(uf, "pIBSUF"),
    vIbsUf: text(uf?.vIBSUF),
    pIbsMun: rateOf(mun, "pIBSMun"),
    vIbsMun: text(mun?.vIBSMun),
    pCbs: rateOf(cbs, "pCBS"),
    vCbs: text(cbs?.vCBS),
  };
};

const isOf = (imposto: Record<string, unknown> | null) => {
  const group = asRecord(imposto?.IS);
  return { vBcIs: text(group?.vBCIS), pIs: text(group?.pIS), vIs: text(group?.vIS) };
};

const itemFrom = (det: Record<string, unknown>): DanfeItem => {
  const prod = asRecord(det.prod);
  const imposto = asRecord(det.imposto);
  const icms = icmsOf(imposto);
  const ipi = ipiOf(imposto);
  const ibs = ibsOf(imposto);
  const is = isOf(imposto);
  return {
    nItem: text(det["@_nItem"]),
    cProd: text(prod?.cProd),
    xProd: text(prod?.xProd),
    ncm: text(prod?.NCM),
    orig: icms.orig,
    cst: icms.cst,
    vTotTrib: text(imposto?.vTotTrib),
    cfop: text(prod?.CFOP),
    uCom: text(prod?.uCom),
    qCom: text(prod?.qCom),
    vUnCom: text(prod?.vUnCom),
    vProd: text(prod?.vProd),
    vBc: icms.vBc,
    vIcms: icms.vIcms,
    pIcms: icms.pIcms,
    ...ipi,
    ...ibs,
    ...is,
    infAdProd: text(det.infAdProd),
  };
};

const volumeFrom = (row: Record<string, unknown>): DanfeVolume => ({
  qVol: text(row.qVol),
  esp: text(row.esp),
  marca: text(row.marca),
  nVol: text(row.nVol),
  pesoL: text(row.pesoL),
  pesoB: text(row.pesoB),
});

export const parseDanfeXml = (xml: string): DanfeModel => {
  const parsed = parser.parse(xml) as unknown;
  const inf = findInfNFe(parsed);
  if (!inf) {
    throw new Error("O XML da nota não contém infNFe.");
  }
  const ide = asRecord(inf.ide);
  const protocol = findProtocol(parsed);
  const chaveFromId = text(inf["@_Id"]).replace(/^NFe/, "");
  const chave = text(protocol?.chNFe) || chaveFromId;
  const cStat = text(protocol?.cStat);
  const total = asRecord(inf.total);
  const icmsTot = asRecord(total?.ICMSTot);
  const ibsTot = asRecord(total?.IBSCBSTot);
  const gIbs = asRecord(ibsTot?.gIBS);
  const mono = asRecord(ibsTot?.gMono);
  const issqnTot = asRecord(total?.ISSQNtot);
  const transp = asRecord(inf.transp);
  const carrier = asRecord(transp?.transporta);
  const vehicle = asRecord(transp?.veicTransp);
  const cobr = asRecord(inf.cobr);
  const fat = asRecord(cobr?.fat);
  const extra = asRecord(inf.infAdic);

  return {
    authorized: cStat === "100" || cStat === "150",
    chave,
    protocol: text(protocol?.nProt),
    receivedAt: text(protocol?.dhRecbto),
    qrCode: text(findSupl(parsed)?.qrCode),
    urlChave: text(findSupl(parsed)?.urlChave),
    mod: text(ide?.mod),
    tpEmis: text(ide?.tpEmis),
    natOp: text(ide?.natOp),
    serie: text(ide?.serie),
    nNf: text(ide?.nNF),
    dhEmi: text(ide?.dhEmi),
    dhSaiEnt: text(ide?.dhSaiEnt),
    tpNf: text(ide?.tpNF),
    tpAmb: text(ide?.tpAmb),
    emit: partyFrom(inf.emit, "enderEmit") ?? emptyParty(),
    dest: partyFrom(inf.dest, "enderDest"),
    retirada: partyFrom(inf.retirada),
    entrega: partyFrom(inf.entrega),
    items: asList(inf.det).map(itemFrom),
    totals: {
      vBc: text(icmsTot?.vBC),
      vIcms: text(icmsTot?.vICMS),
      vBcSt: text(icmsTot?.vBCST),
      vSt: text(icmsTot?.vST),
      vProd: text(icmsTot?.vProd),
      vFrete: text(icmsTot?.vFrete),
      vSeg: text(icmsTot?.vSeg),
      vDesc: text(icmsTot?.vDesc),
      vOutro: text(icmsTot?.vOutro),
      vIpi: text(icmsTot?.vIPI),
      vNf: text(icmsTot?.vNF),
      vFcp: text(icmsTot?.vFCP),
      vFcpSt: text(icmsTot?.vFCPST),
      vIcmsUfDest: text(icmsTot?.vICMSUFDest),
      vFcpUfDest: text(icmsTot?.vFCPUFDest),
      qBcMono: text(icmsTot?.qBCMono),
      vIcmsMono: text(icmsTot?.vICMSMono),
      qBcMonoReten: text(icmsTot?.qBCMonoReten),
      vIcmsMonoReten: text(icmsTot?.vICMSMonoReten),
      vTotTrib: text(icmsTot?.vTotTrib),
      vIbs: text(gIbs?.vIBS),
      vIbsUf: text(asRecord(gIbs?.gIBSUF)?.vIBSUF),
      vIbsMun: text(asRecord(gIbs?.gIBSMun)?.vIBSMun),
      vCbs: text(asRecord(ibsTot?.gCBS)?.vCBS),
      vIs: text(asRecord(total?.ISTot)?.vIS),
      hasIbsCbs: Boolean(ibsTot || asRecord(total?.ISTot)),
      mono: mono
        ? {
            vIbsMono: text(mono.vIBSMono),
            vCbsMono: text(mono.vCBSMono),
            vIbsMonoReten: text(mono.vIBSMonoReten),
            vCbsMonoReten: text(mono.vCBSMonoReten),
          }
        : null,
      issqn: issqnTot
        ? { vServ: text(issqnTot.vServ), vBc: text(issqnTot.vBC), vIss: text(issqnTot.vISS) }
        : null,
    },
    modFrete: text(transp?.modFrete),
    carrierName: text(carrier?.xNome),
    carrierDocument: text(carrier?.CNPJ) || text(carrier?.CPF),
    carrierIe: text(carrier?.IE),
    carrierAddress: text(carrier?.xEnder),
    carrierCity: text(carrier?.xMun),
    carrierUf: text(carrier?.UF),
    vehiclePlate: text(vehicle?.placa),
    vehicleUf: text(vehicle?.UF),
    volumes: asList(transp?.vol).map(volumeFrom),
    invoiceNumber: text(fat?.nFat),
    invoiceOriginal: text(fat?.vOrig),
    invoiceDiscount: text(fat?.vDesc),
    invoiceNet: text(fat?.vLiq),
    duplicates: asList(cobr?.dup).map((row) => ({
      nDup: text(row.nDup),
      dVenc: text(row.dVenc),
      vDup: text(row.vDup),
    })),
    payments: asList(asRecord(inf.pag)?.detPag).map((row) => ({
      indPag: text(row.indPag),
      tPag: text(row.tPag),
      xPag: text(row.xPag),
      vPag: text(row.vPag),
    })),
    vTroco: text(asRecord(inf.pag)?.vTroco),
    infCpl: text(extra?.infCpl),
    infAdFisco: text(extra?.infAdFisco),
  };
};
