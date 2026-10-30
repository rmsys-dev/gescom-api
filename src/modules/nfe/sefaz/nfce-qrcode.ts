import { createHash } from "node:crypto";
import { BadRequestError } from "../../../shared/errors/app-error.js";
import type { UfSigla } from "./uf.js";

type NfceUrls = { qrCode: string; urlChave: string };

/** URLs de consulta da NFC-e por UF (portal nacional da NFC-e): [homologação, produção]. */
const NFCE_URLS: Partial<Record<UfSigla, [NfceUrls, NfceUrls]>> = {
  AC: [
    { qrCode: "http://www.hml.sefaznet.ac.gov.br/nfce/qrcode", urlChave: "www.hml.sefaznet.ac.gov.br/nfce/consulta" },
    { qrCode: "http://www.sefaznet.ac.gov.br/nfce/qrcode", urlChave: "www.sefaznet.ac.gov.br/nfce/consulta" },
  ],
  AL: [
    { qrCode: "http://nfce.sefaz.al.gov.br/QRCode/consultarNFCe.jsp", urlChave: "www.sefaz.al.gov.br/nfce/consulta" },
    { qrCode: "http://nfce.sefaz.al.gov.br/QRCode/consultarNFCe.jsp", urlChave: "www.sefaz.al.gov.br/nfce/consulta" },
  ],
  AM: [
    { qrCode: "https://sistemas.sefaz.am.gov.br/nfceweb-hom/consultarNFCe.jsp", urlChave: "www.sefaz.am.gov.br/nfce/consulta" },
    { qrCode: "https://sistemas.sefaz.am.gov.br/nfceweb/consultarNFCe.jsp", urlChave: "www.sefaz.am.gov.br/nfce/consulta" },
  ],
  AP: [
    { qrCode: "https://www.sefaz.ap.gov.br/nfcehml/nfce.php", urlChave: "www.sefaz.ap.gov.br/nfce/consulta" },
    { qrCode: "https://www.sefaz.ap.gov.br/nfce/nfcep.php", urlChave: "www.sefaz.ap.gov.br/nfce/consulta" },
  ],
  BA: [
    { qrCode: "http://hnfe.sefaz.ba.gov.br/servicos/nfce/qrcode.aspx", urlChave: "http://hinternet.sefaz.ba.gov.br/nfce/consulta" },
    { qrCode: "http://nfe.sefaz.ba.gov.br/servicos/nfce/qrcode.aspx", urlChave: "www.sefaz.ba.gov.br/nfce/consulta" },
  ],
  CE: [
    { qrCode: "http://nfceh.sefaz.ce.gov.br/pages/ShowNFCe.html", urlChave: "www.sefaz.ce.gov.br/nfce/consulta" },
    { qrCode: "http://nfce.sefaz.ce.gov.br/pages/ShowNFCe.html", urlChave: "www.sefaz.ce.gov.br/nfce/consulta" },
  ],
  DF: [
    { qrCode: "http://www.fazenda.df.gov.br/nfce/qrcode", urlChave: "www.fazenda.df.gov.br/nfce/consulta" },
    { qrCode: "http://www.fazenda.df.gov.br/nfce/qrcode", urlChave: "www.fazenda.df.gov.br/nfce/consulta" },
  ],
  ES: [
    { qrCode: "http://homologacao.sefaz.es.gov.br/ConsultaNFCe/qrcode.aspx", urlChave: "www.sefaz.es.gov.br/nfce/consulta" },
    { qrCode: "http://app.sefaz.es.gov.br/ConsultaNFCe/qrcode.aspx", urlChave: "www.sefaz.es.gov.br/nfce/consulta" },
  ],
  GO: [
    {
      qrCode: "https://nfewebhomolog.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe",
      urlChave: "www.nfce.go.gov.br/post/ver/214413/consulta-nfc-e-homologacao",
    },
    { qrCode: "https://nfeweb.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe", urlChave: "www.sefaz.go.gov.br/nfce/consulta" },
  ],
  MA: [
    { qrCode: "http://www.hom.nfce.sefaz.ma.gov.br/portal/consultarNFCe.jsp", urlChave: "www.sefaz.ma.gov.br/nfce/consulta" },
    { qrCode: "http://www.nfce.sefaz.ma.gov.br/portal/consultarNFCe.jsp", urlChave: "www.sefaz.ma.gov.br/nfce/consulta" },
  ],
  MG: [
    { qrCode: "https://hportalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml", urlChave: "https://hportalsped.fazenda.mg.gov.br/portalnfce" },
    { qrCode: "https://portalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml", urlChave: "https://portalsped.fazenda.mg.gov.br/portalnfce" },
  ],
  MS: [
    { qrCode: "http://www.dfe.ms.gov.br/nfce/qrcode", urlChave: "www.dfe.ms.gov.br/nfce/consulta" },
    { qrCode: "http://www.dfe.ms.gov.br/nfce/qrcode", urlChave: "www.dfe.ms.gov.br/nfce/consulta" },
  ],
  MT: [
    { qrCode: "http://homologacao.sefaz.mt.gov.br/nfce/consultanfce", urlChave: "http://homologacao.sefaz.mt.gov.br/nfce/consultanfce" },
    { qrCode: "http://www.sefaz.mt.gov.br/nfce/consultanfce", urlChave: "www.sefaz.mt.gov.br/nfce/consultanfce" },
  ],
  PA: [
    { qrCode: "https://appnfc.sefa.pa.gov.br/portal-homologacao/view/consultas/nfce/nfceForm.seam", urlChave: "www.sefa.pa.gov.br/nfce/consulta" },
    { qrCode: "https://appnfc.sefa.pa.gov.br/portal/view/consultas/nfce/nfceForm.seam", urlChave: "www.sefa.pa.gov.br/nfce/consulta" },
  ],
  PB: [
    { qrCode: "http://www.sefaz.pb.gov.br/nfcehom", urlChave: "www.sefaz.pb.gov.br/nfcehom" },
    { qrCode: "http://www.sefaz.pb.gov.br/nfce", urlChave: "www.sefaz.pb.gov.br/nfce/consulta" },
  ],
  PE: [
    { qrCode: "http://nfcehomolog.sefaz.pe.gov.br/nfce/consulta", urlChave: "nfce.sefaz.pe.gov.br/nfce/consulta" },
    { qrCode: "http://nfce.sefaz.pe.gov.br/nfce/consulta", urlChave: "nfce.sefaz.pe.gov.br/nfce/consulta" },
  ],
  PI: [
    { qrCode: "http://www.sefaz.pi.gov.br/nfce/qrcode", urlChave: "www.sefaz.pi.gov.br/nfce/consulta" },
    { qrCode: "http://www.sefaz.pi.gov.br/nfce/qrcode", urlChave: "www.sefaz.pi.gov.br/nfce/consulta" },
  ],
  PR: [
    { qrCode: "http://www.fazenda.pr.gov.br/nfce/qrcode", urlChave: "www.fazenda.pr.gov.br/nfce/consulta" },
    { qrCode: "http://www.fazenda.pr.gov.br/nfce/qrcode", urlChave: "www.fazenda.pr.gov.br/nfce/consulta" },
  ],
  RJ: [
    { qrCode: "https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode", urlChave: "www.fazenda.rj.gov.br/nfce/consulta" },
    { qrCode: "https://consultadfe.fazenda.rj.gov.br/consultaNFCe/QRCode", urlChave: "www.fazenda.rj.gov.br/nfce/consulta" },
  ],
  RN: [
    { qrCode: "http://hom.nfce.set.rn.gov.br/consultarNFCe.aspx", urlChave: "www.set.rn.gov.br/nfce/consulta" },
    { qrCode: "http://nfce.set.rn.gov.br/consultarNFCe.aspx", urlChave: "www.set.rn.gov.br/nfce/consulta" },
  ],
  RO: [
    { qrCode: "http://www.nfce.sefin.ro.gov.br/consultanfce/consulta.jsp", urlChave: "www.sefin.ro.gov.br/nfce/consulta" },
    { qrCode: "http://www.nfce.sefin.ro.gov.br/consultanfce/consulta.jsp", urlChave: "www.sefin.ro.gov.br/nfce/consulta" },
  ],
  RR: [
    { qrCode: "http://200.174.88.103:8080/nfce/servlet/qrcode", urlChave: "www.sefaz.rr.gov.br/nfce/consulta" },
    { qrCode: "https://www.sefaz.rr.gov.br/servlet/qrcode", urlChave: "www.sefaz.rr.gov.br/nfce/consulta" },
  ],
  RS: [
    { qrCode: "https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx", urlChave: "www.sefaz.rs.gov.br/nfce/consulta" },
    { qrCode: "https://www.sefaz.rs.gov.br/NFCE/NFCE-COM.aspx", urlChave: "www.sefaz.rs.gov.br/nfce/consulta" },
  ],
  SC: [
    { qrCode: "https://hom.sat.sef.sc.gov.br/nfce/consulta", urlChave: "https://hom.sat.sef.sc.gov.br/nfce/consulta" },
    { qrCode: "https://sat.sef.sc.gov.br/nfce/consulta", urlChave: "https://sat.sef.sc.gov.br/nfce/consulta" },
  ],
  SE: [
    { qrCode: "http://www.hom.nfe.se.gov.br/nfce/qrcode", urlChave: "http://www.hom.nfe.se.gov.br/nfce/consulta" },
    { qrCode: "http://www.nfce.se.gov.br/nfce/qrcode", urlChave: "http://www.nfce.se.gov.br/nfce/consulta" },
  ],
  SP: [
    {
      qrCode: "https://www.homologacao.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx",
      urlChave: "https://www.homologacao.nfce.fazenda.sp.gov.br/consulta",
    },
    {
      qrCode: "https://www.nfce.fazenda.sp.gov.br/NFCeConsultaPublica/Paginas/ConsultaQRCode.aspx",
      urlChave: "https://www.nfce.fazenda.sp.gov.br/consulta",
    },
  ],
  TO: [
    { qrCode: "http://homologacao.sefaz.to.gov.br/nfce/qrcode", urlChave: "www.sefaz.to.gov.br/nfce/consulta" },
    { qrCode: "http://www.sefaz.to.gov.br/nfce/qrcode", urlChave: "www.sefaz.to.gov.br/nfce/consulta" },
  ],
};

export type NfceSupl = { qrCode: string; urlChave: string };

/** QR Code versão 2 on-line (NT 2015.002): `url?p=chave|2|tpAmb|idCSC|hash`, hash = SHA-1 de `chave|2|tpAmb|idCSC` + CSC. */
export const buildNfceSupl = (input: {
  uf: UfSigla;
  chave: string;
  tpAmb: 1 | 2;
  tpEmis: number;
  idCsc: string | null | undefined;
  csc: string | null | undefined;
}): NfceSupl => {
  const urls = NFCE_URLS[input.uf]?.[input.tpAmb === 2 ? 0 : 1];
  if (!urls) {
    throw new BadRequestError(`URL do QR Code da NFC-e nao cadastrada para a UF ${input.uf}`, "NFCE_QRCODE_UF");
  }
  if (input.tpEmis === 9) {
    throw new BadRequestError("NFC-e em contingencia off-line ainda nao e suportada", "NFCE_QRCODE_OFFLINE");
  }
  const idCsc = String(input.idCsc ?? "").replace(/\D/g, "");
  const csc = String(input.csc ?? "").trim();
  if (!idCsc || Number(idCsc) === 0 || !csc) {
    throw new BadRequestError(
      "Informe o ID do CSC e o CSC nas configuracoes da nota para emitir NFC-e",
      "NFCE_CSC_REQUIRED",
    );
  }
  const params = `${input.chave}|2|${input.tpAmb}|${Number(idCsc)}`;
  const hash = createHash("sha1").update(`${params}${csc}`).digest("hex").toUpperCase();
  return { qrCode: `${urls.qrCode}?p=${params}|${hash}`, urlChave: urls.urlChave };
};

const xmlText = (value: string) =>
  value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");

/** infNFeSupl fica entre o infNFe e a Signature; fora do trecho assinado. */
export const insertNfceSupl = (signedXml: string, supl: NfceSupl): string => {
  const group = `<infNFeSupl><qrCode>${xmlText(supl.qrCode)}</qrCode><urlChave>${xmlText(supl.urlChave)}</urlChave></infNFeSupl>`;
  const at = signedXml.indexOf("</infNFe>");
  if (at < 0) {
    throw new BadRequestError("XML da NFC-e sem infNFe para incluir o QR Code", "NFCE_QRCODE_XML");
  }
  const end = at + "</infNFe>".length;
  return `${signedXml.slice(0, end)}${group}${signedXml.slice(end)}`;
};
