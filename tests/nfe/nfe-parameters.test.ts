import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  mergeNfeParameters,
  nfeParameterDefaults,
  serializeNfeParameters,
} from "../../src/modules/nfe/parameters/catalog.js";
import { patchNfeParametersSchema } from "../../src/modules/nfe/parameters/schema.js";

describe("nfe parameters catalog", () => {
  it("usa defaults quando nao ha linhas", () => {
    assert.deepEqual(mergeNfeParameters([]), { ...nfeParameterDefaults });
  });

  it("sobrescreve default com valor do banco", () => {
    const merged = mergeNfeParameters([
      {
        parameter: "portal_nfe",
        value: "https://www.nfe.fazenda.gov.br/portal/custom",
      },
    ]);
    assert.equal(
      merged.portal_nfe,
      "https://www.nfe.fazenda.gov.br/portal/custom",
    );
    assert.equal(merged.versao_layout, nfeParameterDefaults.versao_layout);
    assert.equal(
      merged.portal_consulta_nfe,
      nfeParameterDefaults.portal_consulta_nfe,
    );
  });

  it("ignora slug desconhecido", () => {
    const merged = mergeNfeParameters([
      { parameter: "url_sefaz_go", value: "https://example.com" },
    ]);
    assert.deepEqual(merged, { ...nfeParameterDefaults });
  });

  it("serialize preenche o catalogo completo", () => {
    const serialized = serializeNfeParameters({ versao_layout: "4.00" });
    assert.equal(serialized.versao_layout, "4.00");
    assert.equal(serialized.portal_nfe, nfeParameterDefaults.portal_nfe);
  });
});

describe("nfe parameters patch schema", () => {
  it("aceita um campo conhecido", () => {
    const parsed = patchNfeParametersSchema.parse({
      portal_nfe: "https://www.nfe.fazenda.gov.br/portal",
    });
    assert.equal(parsed.portal_nfe, "https://www.nfe.fazenda.gov.br/portal");
  });

  it("rejeita slug desconhecido", () => {
    const result = patchNfeParametersSchema.safeParse({
      url_sefaz_go: "https://example.com",
    });
    assert.equal(result.success, false);
  });

  it("rejeita body vazio", () => {
    const result = patchNfeParametersSchema.safeParse({});
    assert.equal(result.success, false);
  });

  it("rejeita URL invalida no portal", () => {
    const result = patchNfeParametersSchema.safeParse({
      portal_nfe: "nao-e-url",
    });
    assert.equal(result.success, false);
  });
});
