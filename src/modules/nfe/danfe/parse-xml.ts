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
  vIpi: string;
  pIpi: string;
  vIbs: string;
  vCbs: string;
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
  tPag: string;
  xPag: string;
  vPag: string;
};

export type DanfeModel = {
  authorized: boolean;
  chave: string;
  protocol: string;
  receivedAt: string;
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
    vTotTrib: string;
    vIbs: string;
    vCbs: string;
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
  return { vIpi: text(trib?.vIPI), pIpi: text(trib?.pIPI) };
};

const ibsOf = (imposto: Record<string, unknown> | null) => {
  const group = asRecord(asRecord(imposto?.IBSCBS)?.gIBSCBS);
  return {
    vIbs: text(group?.vIBS),
    vCbs: text(asRecord(group?.gCBS)?.vCBS),
  };
};

const itemFrom = (det: Record<string, unknown>): DanfeItem => {
  const prod = asRecord(det.prod);
  const imposto = asRecord(det.imposto);
  const icms = icmsOf(imposto);
  const ipi = ipiOf(imposto);
  const ibs = ibsOf(imposto);
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
    vIpi: ipi.vIpi,
    pIpi: ipi.pIpi,
    vIbs: ibs.vIbs,
    vCbs: ibs.vCbs,
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
      vTotTrib: text(icmsTot?.vTotTrib),
      vIbs: text(asRecord(ibsTot?.gIBS)?.vIBS),
      vCbs: text(asRecord(ibsTot?.gCBS)?.vCBS),
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
      tPag: text(row.tPag),
      xPag: text(row.xPag),
      vPag: text(row.vPag),
    })),
    infCpl: text(extra?.infCpl),
    infAdFisco: text(extra?.infAdFisco),
  };
};
