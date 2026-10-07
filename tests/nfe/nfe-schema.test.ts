import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { describe, it } from "node:test";
import forge from "node-forge";
import { BadRequestError } from "../../src/shared/errors/app-error.js";
import { buildNfeXml } from "../../src/modules/nfe/sefaz/nfe-xml.js";
import { signNfeXml } from "../../src/modules/nfe/sefaz/sign-xml.js";
import {
  assertNfeXmlSchema,
  validateNfeXml,
} from "../../src/modules/nfe/sefaz/validate-xml.js";

const testKey = () => {
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
  certificate.sign(forgePrivate, forge.md.sha256.create());
  return {
    privateKeyPem,
    certificatePem: forge.pki.certificateToPem(certificate),
  };
};

const signedSale = (
  mod: "55" | "65" = "55",
  invoice: Parameters<typeof buildNfeXml>[0]["invoice"] = null,
) =>
  signNfeXml(
    buildNfeXml({
      chave: "5".repeat(44),
      cUf: "52",
      cNf: "12345678",
      natOp: "VENDA",
      mod,
      serie: "1",
      nNf: 10,
      dhEmi: "2026-09-24T10:00:00-03:00",
      tpNf: "1",
      idDest: "1",
      cMunFg: 5208707,
      tpImp: mod === "65" ? "4" : "1",
      tpEmis: 1,
      cDv: "5",
      tpAmb: 2,
      finNfe: "1",
      indFinal: "1",
      indPres: "1",
      procEmi: "0",
      verProc: "gescom",
      emit: {
        cnpj: "00000000000191",
        xNome: "Empresa Teste",
        ie: "123456789",
        crt: "3",
        xlgr: "Rua A",
        nro: "10",
        xbairro: "Centro",
        cmun: "5208707",
        xmun: "Goiania",
        uf: "GO",
        cep: "74000000",
      },
      dest: mod === "65" ? null : {
        cnpj: "00000000000272",
        xNome: "Cliente",
        indIeDest: "9",
        xlgr: "Rua B",
        nro: "20",
        xbairro: "Setor",
        cmun: "5208707",
        xmun: "Goiania",
        uf: "GO",
        cep: "74000000",
      },
      items: [
        {
          nItem: 1,
          cProd: "1",
          xProd: "Produto",
          ncm: "23025000",
          cfop: "5102",
          uCom: "UN",
          qCom: 1,
          vUnCom: 100,
          vProd: 100,
          indTot: "1",
          icmsOrig: "0",
          icmsCst: "00",
          icmsVBc: 100,
          icmsPIcms: 18,
          icmsVIcms: 18,
          pisCst: "01",
          pisVBc: 100,
          pisPPis: 1.65,
          pisVPis: 1.65,
          cofinsCst: "01",
          cofinsVBc: 100,
          cofinsPCofins: 7.6,
          cofinsVCofins: 7.6,
          ibsCbsCst: "000",
          ibsCbsCClassTrib: "000001",
          ibsCbsVBc: 100,
          ibsUfPIbs: 0.1,
          ibsUfPRedAliq: 60,
          ibsUfPAliqEfet: 0.04,
          ibsUfVIbs: 0.04,
          ibsMunPIbs: 0,
          ibsMunPRedAliq: 60,
          ibsMunPAliqEfet: 0,
          ibsMunVIbs: 0,
          ibsVIbs: 0.04,
          cbsPCbs: 0.9,
          cbsPRedAliq: 60,
          cbsPAliqEfet: 0.36,
          cbsVCbs: 0.36,
          vTotTrib: 27.25,
        },
      ],
      invoice,
      payments: [{ indPag: invoice ? "1" : "0", tPag: invoice ? "15" : "01", vPag: 100 }],
      vBc: 100,
      vIcms: 18,
      vProd: 100,
      vPis: 1.65,
      vCofins: 7.6,
      vNf: 100,
      vTotTrib: 27.25,
      vBcIbsCbs: 100,
      vIbsUf: 0.1,
      vIbsMun: 0,
      vIbs: 0.1,
      vCbs: 0.9,
      vNfTot: 101,
      transport: mod === "65" ? null : { modFrete: "9" },
    }),
    testKey(),
  );

describe("schema da NF-e", () => {
  it("recusa XML que nao segue o leiaute", async () => {
    const errors = await validateNfeXml(
      `<NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe/></NFe>`,
    );
    assert.ok(errors.length > 0);
    await assert.rejects(
      () => assertNfeXmlSchema(`<NFe xmlns="http://www.portalfiscal.inf.br/nfe"/>`),
      (error: unknown) =>
        error instanceof BadRequestError &&
        error.code === "NFE_XML_SCHEMA_INVALID",
    );
  });

  it("aceita uma saida modelo 55 assinada", async () => {
    const errors = await validateNfeXml(signedSale());
    assert.deepEqual(errors, []);
  });

  it("aceita uma NF-e com fatura e duplicatas", async () => {
    const errors = await validateNfeXml(
      signedSale("55", {
        nFat: "10",
        vOrig: 100,
        vDesc: 0,
        vLiq: 100,
        duplicates: [
          { nDup: "001", dVenc: "2026-10-24", vDup: 33.33 },
          { nDup: "002", dVenc: "2026-11-23", vDup: 33.33 },
          { nDup: "003", dVenc: "2026-12-23", vDup: 33.34 },
        ],
      }),
    );
    assert.deepEqual(errors, []);
  });

  it("aceita uma NFC-e modelo 65 assinada", async () => {
    const errors = await validateNfeXml(signedSale("65"));
    assert.deepEqual(errors, []);
  });
});
