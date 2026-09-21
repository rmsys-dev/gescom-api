import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AppError } from "../../src/shared/errors/app-error.js";
import { resolveAutorizador } from "../../src/modules/nfe/sefaz/autorizadores.js";
import { resolveStatusServicoUrl } from "../../src/modules/nfe/sefaz/endpoints.js";
import { getCufFromUf, getUfFromCuf, isUfSigla } from "../../src/modules/nfe/sefaz/uf.js";
import {
  buildConsStatServXml,
  buildStatusServicoSoapEnvelope,
  parseRetConsStatServ,
} from "../../src/modules/nfe/sefaz/xml.js";
import { statusServicoQuerySchema } from "../../src/modules/nfe/schema.js";
import { memoryCache } from "../../src/shared/cache/memory-cache.js";
import { MS_PER_MINUTE } from "../../src/shared/time/duration.js";
import {
  readStatusServicoCache,
  STATUS_SERVICO_CACHE_TTL_MS,
  statusServicoCacheKey,
  writeStatusServicoCache,
} from "../../src/modules/nfe/sefaz/status-servico-cache.js";
import type { StatusServicoResponse } from "../../src/modules/nfe/sefaz/xml.js";

describe("nfe sefaz uf", () => {
  it("mapeia sigla GO para cUF 52", () => {
    assert.equal(getCufFromUf("GO"), "52");
    assert.equal(getUfFromCuf("52"), "GO");
    assert.equal(isUfSigla("GO"), true);
    assert.equal(isUfSigla("XX"), false);
  });
});

describe("nfe sefaz autorizadores e endpoints", () => {
  it("usa SEFAZ-GO para NF-e e NFC-e", () => {
    assert.equal(resolveAutorizador("GO", "55"), "GO");
    assert.equal(resolveAutorizador("GO", "65"), "GO");
    assert.equal(
      resolveStatusServicoUrl({ uf: "GO", modelo: "55", ambiente: 2 }),
      "https://homolog.sefaz.go.gov.br/nfe/services/NFeStatusServico4",
    );
    assert.equal(
      resolveStatusServicoUrl({ uf: "GO", modelo: "65", ambiente: 2 }),
      "https://homolog.sefaz.go.gov.br/nfe/services/NFeStatusServico4",
    );
  });

  it("usa SVAN para MA modelo 55 e SVRS para NFC-e", () => {
    assert.equal(resolveAutorizador("MA", "55"), "SVAN");
    assert.equal(resolveAutorizador("MA", "65"), "SVRS");
    assert.equal(
      resolveStatusServicoUrl({ uf: "MA", modelo: "55", ambiente: 1 }),
      "https://www.sefazvirtual.fazenda.gov.br/NFeStatusServico4/NFeStatusServico4.asmx",
    );
    assert.equal(
      resolveStatusServicoUrl({ uf: "SC", modelo: "55", ambiente: 2 }),
      "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx",
    );
  });

  it("usa URL propria de NFC-e em SP", () => {
    assert.equal(resolveAutorizador("SP", "65"), "SP");
    assert.equal(
      resolveStatusServicoUrl({ uf: "SP", modelo: "65", ambiente: 2 }),
      "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFeStatusServico4.asmx",
    );
    assert.equal(
      resolveStatusServicoUrl({ uf: "SP", modelo: "55", ambiente: 2 }),
      "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfestatusservico4.asmx",
    );
  });
});

describe("nfe sefaz xml status servico", () => {
  it("monta consStatServ e envelope SOAP 1.2", () => {
    const payload = buildConsStatServXml({ ambiente: 2, cUF: "52" });
    assert.match(payload, /<consStatServ versao="4.00"/);
    assert.match(payload, /<tpAmb>2<\/tpAmb>/);
    assert.match(payload, /<cUF>52<\/cUF>/);
    assert.match(payload, /<xServ>STATUS<\/xServ>/);

    const envelope = buildStatusServicoSoapEnvelope(payload);
    assert.match(envelope, /<soap12:Envelope/);
    assert.match(envelope, /<nfeDadosMsg xmlns="http:\/\/www.portalfiscal.inf.br\/nfe\/wsdl\/NFeStatusServico4">/);
    assert.match(envelope, /<consStatServ versao="4.00"/);
  });

  it("interpreta retConsStatServ com cStat 107 como online", () => {
    const soap = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeResultMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">
      <retConsStatServ versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe">
        <tpAmb>2</tpAmb>
        <verAplic>GO1.0</verAplic>
        <cStat>107</cStat>
        <xMotivo>Servico em Operacao</xMotivo>
        <cUF>52</cUF>
        <dhRecbto>2026-09-21T09:00:00-03:00</dhRecbto>
        <tMed>1</tMed>
      </retConsStatServ>
    </nfeResultMsg>
  </soap:Body>
</soap:Envelope>`;

    const parsed = parseRetConsStatServ(soap);
    assert.equal(parsed.cStat, "107");
    assert.equal(parsed.xMotivo, "Servico em Operacao");
    assert.equal(parsed.tpAmb, "2");
    assert.equal(parsed.cUF, "52");
    assert.equal(parsed.tMed, "1");
    assert.equal(parsed.verAplic, "GO1.0");
    assert.equal(parsed.online, true);
  });

  it("interpreta cStat diferente de 107 como offline", () => {
    const soap = `<retConsStatServ versao="4.00">
      <cStat>108</cStat>
      <xMotivo>Servico paralisado momentaneamente</xMotivo>
      <cUF>52</cUF>
    </retConsStatServ>`;

    const parsed = parseRetConsStatServ(soap);
    assert.equal(parsed.cStat, "108");
    assert.equal(parsed.online, false);
  });

  it("lanca SEFAZ_UNAVAILABLE em SOAP Fault", () => {
    const soap = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <soap:Fault>
      <soap:Reason>
        <soap:Text>Erro interno</soap:Text>
      </soap:Reason>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;

    assert.throws(
      () => parseRetConsStatServ(soap),
      (error: unknown) =>
        error instanceof AppError && error.code === "SEFAZ_UNAVAILABLE",
    );
  });
});

describe("nfe status servico query schema", () => {
  it("normaliza UF e assume modelo 55", () => {
    const parsed = statusServicoQuerySchema.parse({ uf: "go" });
    assert.deepEqual(parsed, { uf: "GO", modelo: "55" });
  });

  it("aceita modelo 65", () => {
    const parsed = statusServicoQuerySchema.parse({ uf: "SP", modelo: "65" });
    assert.deepEqual(parsed, { uf: "SP", modelo: "65" });
  });
});

describe("nfe status servico intervalo 3 minutos", () => {
  it("monta chave por empresa, ambiente, UF e modelo", () => {
    assert.equal(
      statusServicoCacheKey({
        enterpriseId: "ent-1",
        uf: "GO",
        modelo: "55",
        ambiente: 2,
      }),
      "nfe:status-servico:ent-1:2:GO:55",
    );
  });

  it("reaproveita o ultimo status por 3 minutos", () => {
    assert.equal(STATUS_SERVICO_CACHE_TTL_MS, 3 * MS_PER_MINUTE);
    const key = "nfe:status-servico:test-cache";
    memoryCache.delete(key);
    const payload: StatusServicoResponse = {
      tpAmb: "2",
      verAplic: "GO1.0",
      cStat: "107",
      xMotivo: "Servico em Operacao",
      cUF: "52",
      dhRecbto: "2026-09-21T09:00:00-03:00",
      tMed: "1",
      online: true,
      uf: "GO",
      modelo: "55",
    };

    writeStatusServicoCache(key, payload);
    assert.deepEqual(readStatusServicoCache(key), payload);
    memoryCache.delete(key);
    assert.equal(readStatusServicoCache(key), undefined);
  });
});
