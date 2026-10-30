import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { patchEnterpriseSchema } from "../../src/modules/enterprises/schema.js";

describe("patchEnterpriseSchema - pasta dos PDFs e modelos impressos", () => {
  it("aceita pasta de rede e modelos, normalizando o codigo", () => {
    const parsed = patchEnterpriseSchema.parse({
      pdfFolder: "  \\\\servidor\\notas  ",
      printModels: ["55", " 65 "],
    });
    assert.equal(parsed.pdfFolder, "\\\\servidor\\notas");
    assert.deepEqual(parsed.printModels, ["55", "65"]);
  });

  it("pasta vazia limpa o campo e lista vazia e valida", () => {
    const parsed = patchEnterpriseSchema.parse({ pdfFolder: "", printModels: [] });
    assert.equal(parsed.pdfFolder, null);
    assert.deepEqual(parsed.printModels, []);
  });

  it("rejeita modelo com tamanho invalido", () => {
    assert.equal(patchEnterpriseSchema.safeParse({ printModels: ["550"] }).success, false);
    assert.equal(patchEnterpriseSchema.safeParse({ printModels: ["5"] }).success, false);
  });

  it("rejeita pasta acima de 500 caracteres", () => {
    assert.equal(patchEnterpriseSchema.safeParse({ pdfFolder: "x".repeat(501) }).success, false);
  });
});
