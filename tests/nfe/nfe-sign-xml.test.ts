import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, it } from "node:test";
import forge from "node-forge";
import { SignedXml } from "xml-crypto";
import { BadRequestError } from "../../src/shared/errors/app-error.js";
import { signNfeXml } from "../../src/modules/nfe/sefaz/sign-xml.js";
import {
  nfeSignedXmlRelativePath,
  readNfeXmlAt,
  resolveNfeXmlFile,
  writeNfeXmlAt,
} from "../../src/modules/nfe/sefaz/xml-path.js";

const CHAVE = "35260612345678000199550010000000011000000015";

const testCertificate = () => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const privateKeyPem = privateKey.export({
    type: "pkcs1",
    format: "pem",
  }) as string;
  const forgePrivate = forge.pki.privateKeyFromPem(privateKeyPem);
  const certificate = forge.pki.createCertificate();
  certificate.publicKey = forge.pki.rsa.setPublicKey(
    forgePrivate.n,
    forgePrivate.e,
  );
  certificate.serialNumber = "01";
  certificate.validity.notBefore = new Date();
  certificate.validity.notAfter = new Date();
  certificate.validity.notAfter.setFullYear(
    certificate.validity.notBefore.getFullYear() + 1,
  );
  const subject = [{ name: "commonName", value: "NF-e Teste" }];
  certificate.setSubject(subject);
  certificate.setIssuer(subject);
  certificate.sign(
    forge.pki.privateKeyFromPem(privateKeyPem),
    forge.md.sha256.create(),
  );
  return {
    privateKeyPem,
    certificatePem: forge.pki.certificateToPem(certificate),
  };
};

const sampleNfe = () =>
  `<?xml version="1.0" encoding="UTF-8"?>` +
  `<NFe xmlns="http://www.portalfiscal.inf.br/nfe">` +
  `<infNFe versao="4.00" Id="NFe${CHAVE}">` +
  `<ide><cUF>35</cUF></ide>` +
  `</infNFe></NFe>`;

describe("assinatura do XML da NF-e", () => {
  it("assina o infNFe com RSA-SHA1 e digest SHA-1", () => {
    const key = testCertificate();
    const signed = signNfeXml(sampleNfe(), key);

    assert.match(
      signed,
      /<Signature xmlns="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#">/,
    );
    assert.match(
      signed,
      /<CanonicalizationMethod Algorithm="http:\/\/www\.w3\.org\/TR\/2001\/REC-xml-c14n-20010315"\s*\/>/,
    );
    assert.match(
      signed,
      /<SignatureMethod Algorithm="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#rsa-sha1"\s*\/>/,
    );
    assert.match(
      signed,
      /<DigestMethod Algorithm="http:\/\/www\.w3\.org\/2000\/09\/xmldsig#sha1"\s*\/>/,
    );
    assert.match(signed, new RegExp(`URI="#NFe${CHAVE}"`));
    assert.match(signed, /<X509Certificate>[A-Za-z0-9+/=\s]+<\/X509Certificate>/);
    assert.ok(signed.indexOf("</infNFe>") < signed.indexOf("<Signature"));

    const signature = signed.slice(
      signed.indexOf("<Signature "),
      signed.indexOf("</Signature>") + "</Signature>".length,
    );
    const verifier = new SignedXml({ publicCert: key.certificatePem });
    verifier.loadSignature(signature);
    assert.equal(verifier.checkSignature(signed), true);
  });

  it("recusa XML sem o Id do infNFe", () => {
    const key = testCertificate();
    assert.throws(
      () => signNfeXml("<NFe><infNFe></infNFe></NFe>", key),
      (error: unknown) =>
        error instanceof BadRequestError && error.code === "NFE_XML_SIGN_TARGET",
    );
  });
});

describe("pasta do XML assinado", () => {
  it("monta o caminho por CNPJ, ano e mes da emissao", () => {
    const relative = nfeSignedXmlRelativePath({
      cnpj: "12.345.678/0001-99",
      dhEmi: new Date("2026-10-01T01:30:00.000Z"),
      chave: CHAVE,
    });
    assert.equal(
      relative,
      `12345678000199/2026/09/${CHAVE}-nfe.xml`,
    );
  });

  it("grava e le o arquivo dentro da pasta base", async () => {
    const base = await mkdtemp(path.join(tmpdir(), "nfe-xml-"));
    try {
      const relative = `12345678000199/2026/09/${CHAVE}-nfe.xml`;
      await writeNfeXmlAt(base, relative, "<NFe/>");
      assert.equal(await readNfeXmlAt(base, relative), "<NFe/>");
      assert.equal(
        resolveNfeXmlFile(relative, base),
        path.join(base, "12345678000199", "2026", "09", `${CHAVE}-nfe.xml`),
      );
    } finally {
      await rm(base, { recursive: true, force: true });
    }
  });

  it("recusa caminho fora da pasta base", () => {
    assert.throws(
      () => resolveNfeXmlFile("../segredo.xml", path.join(tmpdir(), "nfe-xml")),
      (error: unknown) =>
        error instanceof BadRequestError && error.code === "NFE_XML_PATH_INVALID",
    );
  });
});
