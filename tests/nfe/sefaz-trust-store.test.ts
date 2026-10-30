import assert from "node:assert/strict";
import { X509Certificate } from "node:crypto";
import tls from "node:tls";
import { describe, it } from "node:test";
import {
  ICP_BRASIL_RAIZ_V10_PEM,
  sefazTrustedCa,
} from "../../src/modules/nfe/sefaz/trust-store.js";

const ICP_BRASIL_RAIZ_V10_SHA256 =
  "6E0BFF069A26994C15DE2C4888CC54AF84882E5495B7FBF66BE9CCFFEC7489F6";

describe("cadeia TLS da SEFAZ", () => {
  it("confia na raiz ICP-Brasil v10 alem das autoridades do Node", () => {
    const cert = new X509Certificate(ICP_BRASIL_RAIZ_V10_PEM);
    assert.match(cert.subject, /CN=Autoridade Certificadora Raiz Brasileira v10/);
    assert.equal(cert.issuer, cert.subject);
    assert.equal(cert.verify(cert.publicKey), true);
    assert.equal(
      cert.fingerprint256.replaceAll(":", ""),
      ICP_BRASIL_RAIZ_V10_SHA256,
    );
    assert.equal(sefazTrustedCa.length, tls.rootCertificates.length + 1);
    assert.equal(sefazTrustedCa.at(-1), ICP_BRASIL_RAIZ_V10_PEM);
  });
});
