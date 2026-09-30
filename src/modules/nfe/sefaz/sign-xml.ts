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

const infNfeId = (xml: string): string => {
  const match = xml.match(/\bId="(NFe\d{44})"/);
  if (!match?.[1]) {
    throw new BadRequestError(
      "XML da nota fiscal sem infNFe identificavel para assinatura",
      "NFE_XML_SIGN_TARGET",
    );
  }
  return match[1];
};

/** Assinatura envelopada do infNFe: RSA-SHA1, digest SHA-1 e certificado do titular. */
export const signNfeXml = (xml: string, key: NfeSigningKey): string => {
  const id = infNfeId(xml);
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
