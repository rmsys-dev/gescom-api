import forge from "node-forge";
import { AppError } from "../../../shared/errors/app-error.js";
import { isValidCnpj } from "../../../shared/validation/data-normalizers.js";
import { nfeCertInvalidError } from "./errors.js";

export type LoadedClientCert = {
  cert: string;
  key: string;
};

export type InspectedPfx = LoadedClientCert & {
  validFrom: Date;
  validUntil: Date;
  cnpj: string | null;
  subject: string;
};

const digitsOnly = (value: string): string => value.replace(/\D/g, "");

/** OID ICP-Brasil do CNPJ da pessoa juridica no subject. */
const ICP_BRASIL_CNPJ_OID = "2.16.76.1.3.3";

export type CertificateSubjectAttribute = {
  shortName?: string | null;
  name?: string | null;
  type?: string | null;
  value?: unknown;
};

const firstValidCnpjInText = (value: string): string | null => {
  const colonMatch = value.match(/:(\d{14})\s*$/);
  if (colonMatch?.[1] && isValidCnpj(colonMatch[1])) {
    return colonMatch[1];
  }

  const matches = digitsOnly(value).match(/\d{14}/g) ?? [];
  for (const candidate of matches) {
    if (isValidCnpj(candidate)) {
      return candidate;
    }
  }
  return null;
};

const isCommonName = (attribute: CertificateSubjectAttribute): boolean =>
  attribute.shortName === "CN" || attribute.name === "commonName";

const isOrganizationalUnit = (attribute: CertificateSubjectAttribute): boolean =>
  attribute.shortName === "OU" ||
  attribute.name === "organizationalUnitName";

const isIcpBrasilCnpjOid = (attribute: CertificateSubjectAttribute): boolean =>
  attribute.type === ICP_BRASIL_CNPJ_OID;

/**
 * CNPJ do titular (PJ A1). Nao concatena o DN inteiro: o OU da AC
 * (ex. 00597582000135) misturado com o CN gera um bloco de 14 digitos falso.
 */
export const extractCnpjFromSubjectAttributes = (
  attributes: CertificateSubjectAttribute[],
): string | null => {
  const commonName = attributes.find(isCommonName);
  if (commonName) {
    const fromCn = firstValidCnpjInText(String(commonName.value ?? ""));
    if (fromCn) {
      return fromCn;
    }
  }

  for (const attribute of attributes) {
    if (!isIcpBrasilCnpjOid(attribute)) {
      continue;
    }
    const digits = digitsOnly(String(attribute.value ?? ""));
    if (digits.length >= 14) {
      const cnpj = digits.slice(0, 14);
      if (isValidCnpj(cnpj)) {
        return cnpj;
      }
    }
  }

  for (const attribute of attributes) {
    if (isCommonName(attribute) || isOrganizationalUnit(attribute)) {
      continue;
    }
    const found = firstValidCnpjInText(String(attribute.value ?? ""));
    if (found) {
      return found;
    }
  }

  return null;
};

const subjectToString = (certificate: forge.pki.Certificate): string => {
  try {
    return certificate.subject.attributes
      .map((attribute) => `${attribute.shortName ?? attribute.name}=${attribute.value}`)
      .join(", ");
  } catch {
    return "";
  }
};

const extractCnpjFromCertificate = (
  certificate: forge.pki.Certificate,
): string | null => extractCnpjFromSubjectAttributes(certificate.subject.attributes);

const pickLeafCertificate = (
  certificates: forge.pki.Certificate[],
): forge.pki.Certificate | undefined => {
  const withCnpj = certificates.find((certificate) =>
    Boolean(extractCnpjFromCertificate(certificate)),
  );
  return withCnpj ?? certificates[0];
};

export const inspectPfx = (pfx: Buffer, passphrase: string): InspectedPfx => {
  try {
    const asn1 = forge.asn1.fromDer(pfx.toString("binary"));
    const p12 = forge.pkcs12.pkcs12FromAsn1(asn1, passphrase);
    const certBags =
      p12.getBags({ bagType: forge.pki.oids.certBag })[forge.pki.oids.certBag] ??
      [];
    const keyBags =
      p12.getBags({ bagType: forge.pki.oids.pkcs8ShroudedKeyBag })[
        forge.pki.oids.pkcs8ShroudedKeyBag
      ] ??
      p12.getBags({ bagType: forge.pki.oids.keyBag })[forge.pki.oids.keyBag] ??
      [];

    const certificates = certBags
      .map((bag) => bag.cert)
      .filter((certificate): certificate is forge.pki.Certificate =>
        Boolean(certificate),
      );
    const privateKey = keyBags[0]?.key;
    const leaf = pickLeafCertificate(certificates);

    if (!certificates.length || !privateKey || !leaf) {
      throw nfeCertInvalidError(
        "Certificado digital nao contem par de chave e certificado",
      );
    }

    return {
      cert: certificates
        .map((certificate) => forge.pki.certificateToPem(certificate))
        .join("\n"),
      key: forge.pki.privateKeyToPem(privateKey),
      validFrom: leaf.validity.notBefore,
      validUntil: leaf.validity.notAfter,
      cnpj: extractCnpjFromCertificate(leaf),
      subject: subjectToString(leaf),
    };
  } catch (error) {
    if (error instanceof AppError) {
      throw error;
    }
    throw nfeCertInvalidError(
      "Falha ao abrir o certificado digital. Verifique o arquivo PFX e a senha.",
    );
  }
};

export const loadPfxFromBuffer = (
  pfx: Buffer,
  passphrase: string,
): LoadedClientCert => {
  const inspected = inspectPfx(pfx, passphrase);
  return { cert: inspected.cert, key: inspected.key };
};
