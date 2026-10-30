import { asNumber, type TaxNumber } from "./calculate.js";

export type ReformRateSources = {
  cityIbsMun: TaxNumber;
  stateIbsUf: TaxNumber;
  stateIbsMun: TaxNumber;
  countryIbsUf: TaxNumber;
  countryIbsMun: TaxNumber;
  countryCbs: TaxNumber;
  countryIs: TaxNumber;
};

export type ReformRates = {
  pIbsMun: number;
  pIbsUf: number;
  pCbs: number;
  pIs: number;
};

const firstPositive = (...values: TaxNumber[]): number => {
  for (const value of values) {
    const parsed = asNumber(value);
    if (parsed > 0) return parsed;
  }
  return 0;
};

export const resolveReformRates = (
  sources: ReformRateSources,
): ReformRates | null => {
  const pIbsMun = firstPositive(
    sources.cityIbsMun,
    sources.stateIbsMun,
    sources.countryIbsMun,
  );
  const pIbsUf = firstPositive(sources.stateIbsUf, sources.countryIbsUf);
  const pCbs = asNumber(sources.countryCbs);
  const pIs = asNumber(sources.countryIs);
  if (pCbs <= 0 || pIbsUf <= 0) return null;
  return { pIbsMun, pIbsUf, pCbs, pIs };
};
