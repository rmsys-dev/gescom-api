import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { certificatePeriodRejection, certificateValidityMeta } from "../../src/modules/nfe/sefaz/certificate-validity.js";
import { patchNfeConfiguracaoSchema } from "../../src/modules/nfe/configuracao/schema.js";
import { decryptSecret, encryptSecret } from "../../src/modules/nfe/sefaz/secrets.js";
import { extractCnpjFromSubjectAttributes } from "../../src/modules/nfe/sefaz/certificate.js";

describe("nfe certificate validity", () => {
  const now = new Date("2026-09-21T12:00:00.000Z");

  it("marca vencido e calcula dias", () => {
    const expired = certificateValidityMeta(
      new Date("2026-09-20T12:00:00.000Z"),
      now,
    );
    assert.equal(expired.expired, true);
    assert.equal(expired.notYetValid, false);
    assert.equal(expired.daysToExpire, -1);
    assert.equal(expired.expiringSoon, false);
    assert.equal(expired.alerta, "Certificado digital vencido.");

    const valid = certificateValidityMeta(
      new Date("2026-09-24T12:00:00.000Z"),
      now,
    );
    assert.equal(valid.expired, false);
    assert.equal(valid.daysToExpire, 3);
    assert.equal(valid.expiringSoon, true);
    assert.equal(valid.alerta, "Certificado digital vence em 3 dias.");
  });

  it("marca ainda nao valido pelo validFrom", () => {
    const pending = certificateValidityMeta(
      new Date("2027-09-21T12:00:00.000Z"),
      now,
      new Date("2026-09-22T12:00:00.000Z"),
    );
    assert.equal(pending.notYetValid, true);
    assert.equal(pending.expired, false);
    assert.equal(pending.expiringSoon, false);
    assert.equal(pending.alerta, "Certificado digital ainda nao e valido.");
  });

  it("avisa na janela de 30 dias e silencia depois", () => {
    const soon = certificateValidityMeta(
      new Date("2026-10-21T12:00:00.000Z"),
      now,
    );
    assert.equal(soon.expiringSoon, true);
    assert.equal(soon.daysToExpire, 30);
    assert.equal(soon.alerta, "Certificado digital vence em 30 dias.");

    const later = certificateValidityMeta(
      new Date("2026-10-22T12:00:00.000Z"),
      now,
    );
    assert.equal(later.expiringSoon, false);
    assert.equal(later.daysToExpire, 31);
    assert.equal(later.alerta, null);
  });

  it("avisa quando vence hoje", () => {
    const today = certificateValidityMeta(
      new Date("2026-09-21T12:00:00.000Z"),
      now,
    );
    assert.equal(today.expired, false);
    assert.equal(today.daysToExpire, 0);
    assert.equal(today.alerta, "Certificado digital vence hoje.");
  });

  it("rejeita upload vencido ou ainda nao valido", () => {
    const expired = certificatePeriodRejection(
      new Date("2025-01-01T00:00:00.000Z"),
      new Date("2026-09-20T12:00:00.000Z"),
      now,
    );
    assert.equal(expired?.path, "pfx");
    assert.match(expired?.message ?? "", /vencido/);

    const pending = certificatePeriodRejection(
      new Date("2026-09-22T12:00:00.000Z"),
      new Date("2027-09-21T12:00:00.000Z"),
      now,
    );
    assert.equal(pending?.path, "pfx");
    assert.match(pending?.message ?? "", /ainda nao e valido/);

    const ok = certificatePeriodRejection(
      new Date("2025-01-01T00:00:00.000Z"),
      new Date("2027-09-21T12:00:00.000Z"),
      now,
    );
    assert.equal(ok, null);
  });
});

describe("nfe configuracao patch schema", () => {
  it("aceita ambiente e series validos", () => {
    const parsed = patchNfeConfiguracaoSchema.parse({
      ambiente: 2,
      serieNfe: 1,
      tipoEmissao: 1,
    });
    assert.equal(parsed.ambiente, 2);
    assert.equal(parsed.serieNfe, 1);
    assert.equal(parsed.tipoEmissao, 1);
  });

  it("rejeita ambiente invalido", () => {
    const result = patchNfeConfiguracaoSchema.safeParse({ ambiente: 3 });
    assert.equal(result.success, false);
  });

  it("rejeita tipo de emissao invalido", () => {
    const result = patchNfeConfiguracaoSchema.safeParse({ tipoEmissao: 3 });
    assert.equal(result.success, false);
  });

  it("rejeita body vazio", () => {
    const result = patchNfeConfiguracaoSchema.safeParse({});
    assert.equal(result.success, false);
  });
});

describe("nfe secrets", () => {
  it("cifra e recupera o valor", () => {
    const cipher = encryptSecret("senha-teste");
    assert.notEqual(cipher, "senha-teste");
    assert.equal(decryptSecret(cipher), "senha-teste");
  });
});

describe("nfe cnpj do certificado A1", () => {
  const camaruSubject = [
    { shortName: "C", name: "countryName", value: "BR" },
    { shortName: "O", name: "organizationName", value: "ICP-Brasil" },
    { shortName: "ST", name: "stateOrProvinceName", value: "GO" },
    { shortName: "L", name: "localityName", value: "Itumbiara" },
    { shortName: "OU", name: "organizationalUnitName", value: "AC SOLUTI Multipla v5" },
    { shortName: "OU", name: "organizationalUnitName", value: "00597582000135" },
    { shortName: "OU", name: "organizationalUnitName", value: "Presencial" },
    { shortName: "OU", name: "organizationalUnitName", value: "Certificado PJ A1" },
    {
      shortName: "CN",
      name: "commonName",
      value: "CAMARU - INDUSTRIA E COMERCIO DE RACOES LTDA:03888858000122",
    },
  ];

  it("le o CNPJ do CN e ignora o da autoridade certificadora", () => {
    assert.equal(
      extractCnpjFromSubjectAttributes(camaruSubject),
      "03888858000122",
    );
  });

  it("nao concatena o DN inteiro em um bloco falso de 14 digitos", () => {
    const joined =
      "C=BR, O=ICP-Brasil, ST=GO, L=Itumbiara, OU=AC SOLUTI Multipla v5, OU=00597582000135, OU=Presencial, OU=Certificado PJ A1, CN=CAMARU - INDUSTRIA E COMERCIO DE RACOES LTDA:03888858000122";
    const digits = joined.replace(/\D/g, "");
    const last14 = digits.match(/\d{14}/g)?.at(-1);
    assert.equal(last14, "51038888580001");
    assert.notEqual(
      extractCnpjFromSubjectAttributes(camaruSubject),
      last14,
    );
  });
});
