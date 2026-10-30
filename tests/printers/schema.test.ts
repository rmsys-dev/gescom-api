import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildPrinterUncPath,
  createPrinterSchema,
  patchPrinterSchema,
} from "../../src/modules/printers/schema.js";

describe("createPrinterSchema", () => {
  it("aplica padroes e apara os campos", () => {
    const parsed = createPrinterSchema.parse({
      description: " Caixa 01 ",
      computerName: " CAIXA-01 ",
      shareName: " ELGIN i9 ",
    });
    assert.equal(parsed.description, "Caixa 01");
    assert.equal(parsed.computerName, "CAIXA-01");
    assert.equal(parsed.shareName, "ELGIN i9");
    assert.equal(parsed.paperType, "A4");
    assert.equal(parsed.isDefault, false);
    assert.equal(parsed.status, "ATIVO");
  });

  it("rejeita nome de computador com barras, pontos ou espacos", () => {
    for (const computerName of ["\\\\CAIXA", "CAIXA\\01", "caixa.local", "CAIXA 01", "x".repeat(64)]) {
      const result = createPrinterSchema.safeParse({ description: "d", computerName, shareName: "P" });
      assert.equal(result.success, false, computerName);
    }
  });

  it("rejeita compartilhamento com caracteres invalidos", () => {
    for (const shareName of ["a\\b", "a/b", "a:b", "a*b", "a?b", 'a"b', "a<b", "a>b", "a|b", "  "]) {
      const result = createPrinterSchema.safeParse({ description: "d", computerName: "PC", shareName });
      assert.equal(result.success, false, shareName);
    }
  });

  it("rejeita tipo de papel desconhecido", () => {
    const result = createPrinterSchema.safeParse({
      description: "d",
      computerName: "PC",
      shareName: "P",
      paperType: "A5",
    });
    assert.equal(result.success, false);
  });
});

describe("patchPrinterSchema", () => {
  it("exige ao menos um campo", () => {
    assert.equal(patchPrinterSchema.safeParse({}).success, false);
    assert.equal(patchPrinterSchema.safeParse({ isDefault: true }).success, true);
  });
});

describe("buildPrinterUncPath", () => {
  it("monta o caminho \\\\COMPUTADOR\\IMPRESSORA", () => {
    assert.equal(buildPrinterUncPath("CAIXA-01", "ELGIN i9"), "\\\\CAIXA-01\\ELGIN i9");
  });
});
