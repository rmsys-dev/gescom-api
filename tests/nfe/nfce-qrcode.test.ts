import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import { buildNfceSupl, insertNfceSupl } from "../../src/modules/nfe/sefaz/nfce-qrcode.js";

const chave = "52261012345678000199650010000000011123456780";
const XSD_V2_ONLINE =
  /^((HTTPS?|https?):\/\/.*\?p=([0-9]{6}[0-9A-Z]{12}[0-9]{16}(1|3|4)[0-9]{9})\|[2]\|[1-2]\|(0|[1-9]{1}([0-9]{1,5})?)\|[A-Fa-f0-9]{40})$/;

describe("QR Code da NFC-e (versao 2 on-line)", () => {
  it("monta a URL de homologacao de GO no padrao do XSD com o hash do CSC", () => {
    const supl = buildNfceSupl({ uf: "GO", chave, tpAmb: 2, tpEmis: 1, idCsc: "000001", csc: "ABC123" });
    assert.match(supl.qrCode, XSD_V2_ONLINE);
    assert.ok(supl.qrCode.startsWith("https://nfewebhomolog.sefaz.go.gov.br/nfeweb/sites/nfce/danfeNFCe?p="));
    const params = `${chave}|2|2|1`;
    const hash = createHash("sha1").update(`${params}ABC123`).digest("hex").toUpperCase();
    assert.ok(supl.qrCode.endsWith(`?p=${params}|${hash}`));
    assert.ok(supl.urlChave.length >= 21 && supl.urlChave.length <= 85);
  });

  it("exige o CSC configurado", () => {
    assert.throws(
      () => buildNfceSupl({ uf: "GO", chave, tpAmb: 2, tpEmis: 1, idCsc: null, csc: "X" }),
      /CSC/,
    );
    assert.throws(
      () => buildNfceSupl({ uf: "GO", chave, tpAmb: 2, tpEmis: 1, idCsc: "1", csc: "" }),
      /CSC/,
    );
  });

  it("insere o infNFeSupl entre o infNFe e a Signature", () => {
    const xml = `<NFe><infNFe Id="NFe${chave}"></infNFe><Signature></Signature></NFe>`;
    const out = insertNfceSupl(xml, { qrCode: "https://x/y?p=1", urlChave: "www.exemplo.gov.br/nfce" });
    assert.match(out, /<\/infNFe><infNFeSupl><qrCode>https:\/\/x\/y\?p=1<\/qrCode><urlChave>www\.exemplo\.gov\.br\/nfce<\/urlChave><\/infNFeSupl><Signature>/);
  });
});
