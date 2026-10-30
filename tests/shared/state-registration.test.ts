import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { checkStateRegistration } from "../../src/shared/validation/state-registration.js";

const official: Array<[string, string]> = [
  ["AC", "0113253877910"],
  ["AL", "248682954"],
  ["AM", "917050150"],
  ["AP", "039045820"],
  ["BA", "63984300"],
  ["CE", "836182316"],
  ["DF", "0730000100109"],
  ["ES", "463921810"],
  ["GO", "112237118"],
  ["MA", "123517680"],
  ["MG", "2490944173923"],
  ["MS", "282570926"],
  ["MT", "130000019"],
  ["MT", "00130000019"],
  ["PA", "153662476"],
  ["PB", "312029063"],
  ["PE", "064970639"],
  ["PI", "465180426"],
  ["PR", "0031595584"],
  ["RJ", "06540481"],
  ["RN", "204502292"],
  ["RO", "39206839474860"],
  ["RR", "247681047"],
  ["RS", "3288345503"],
  ["SC", "632480718"],
  ["SE", "826594042"],
  ["SP", "110.042.490.114"],
  ["SP", "P-01100424.3/002"],
  ["TO", "27035910938"],
];

describe("inscrição estadual por UF", () => {
  for (const [uf, value] of official) {
    it(`aceita o exemplo oficial de ${uf} (${value})`, () => {
      const result = checkStateRegistration(uf, value);
      assert.equal(result.ok, true, result.ok ? "" : result.message);
    });
  }

  it("rejeita dígito errado e aceita ISENTO só quando permitido", () => {
    assert.equal(checkStateRegistration("SP", "110042490115").ok, false);
    assert.equal(checkStateRegistration("SP", "ISENTO").ok, false);
    const exempt = checkStateRegistration("SP", "isento", { allowExempt: true });
    assert.equal(exempt.ok && exempt.normalized, "ISENTO");
    assert.equal(checkStateRegistration("SP", "  ").ok && checkStateRegistration("SP", "  ").normalized, null);
  });
});
