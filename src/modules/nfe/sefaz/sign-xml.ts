import { SignedXml } from "xml-crypto";
import { BadRequestError } from "../../../shared/errors/app-error.js";

/** C14N inclusivo exigido pelo layout 4.00 (Manual de Orientação do Contribuinte). */
const C14N = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
const ENVELOPED = "http://www.w3.org/2000/09/xmldsig#enveloped-signature";
const RSA_SHA1 = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
const SHA1 = "http://www.w3.org/2000/09/xmldsig#sha1";

export type NfeSigningKey = {
  privateKeyPem: string;
  certificatePem: string;
};

const elementId = (xml: string, pattern: RegExp, label: string): string => {
  const match = xml.match(pattern);
  if (!match?.[1]) {
    throw new BadRequestError(
      `XML sem ${label} identificavel para assinatura`,
      "NFE_XML_SIGN_TARGET",
    );
  }
  return match[1];
};

/** Assinatura envelopada do elemento com o Id informado: RSA-SHA1, digest SHA-1 e certificado do titular. */
export const signXmlElement = (
  xml: string,
  id: string,
  key: NfeSigningKey,
): string => {
  const signer = new SignedXml({
    privateKey: key.privateKeyPem,
    publicCert: key.certificatePem,
    signatureAlgorithm: RSA_SHA1,
    canonicalizationAlgorithm: C14N,
  });
  signer.addReference({
    xpath: `//*[@Id='${id}']`,
    transforms: [ENVELOPED, C14N],
    digestAlgorithm: SHA1,
  });
  signer.computeSignature(xml, {
    location: {
      reference: `//*[@Id='${id}']`,
      action: "after",
    },
  });
  return signer.getSignedXml();
};

export const signNfeXml = (xml: string, key: NfeSigningKey): string =>
  signXmlElement(
    xml,
    elementId(xml, /\bId="(NFe\d{44})"/, "infNFe"),
    key,
  );

/** infEvento: Id `ID{tpEvento}{chave}{nSeqEvento}`. */
export const signEventoXml = (xml: string, key: NfeSigningKey): string =>
  signXmlElement(
    xml,
    elementId(xml, /<infEvento\b[^>]*\bId="(ID\d{52})"/, "infEvento"),
    key,
  );

/** infInut: Id `ID{cUF}{AA}{CNPJ}{mod}{serie}{nNFIni}{nNFFin}`. */
export const signInutXml = (xml: string, key: NfeSigningKey): string =>
  signXmlElement(
    xml,
    elementId(xml, /<infInut\b[^>]*\bId="(ID\d{41})"/, "infInut"),
    key,
  );
