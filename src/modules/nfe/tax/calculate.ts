export type TaxNumber = number | string | null | undefined;

export type TaxItemAmounts = {
  vProd: TaxNumber;
  vFrete?: TaxNumber;
  vSeg?: TaxNumber;
  vDesc?: TaxNumber;
  vOutro?: TaxNumber;
  vIi?: TaxNumber;
};

export type TaxRateInput = {
  icmsCst?: string | null;
  indDeduzDeson?: string | null;
  pIcms?: TaxNumber;
  pFcp?: TaxNumber;
  pRedBc?: TaxNumber;
  pMvaSt?: TaxNumber;
  pRedBcSt?: TaxNumber;
  pIcmsSt?: TaxNumber;
  pIcmsUfDest?: TaxNumber;
  pIcmsInter?: TaxNumber;
  pIcmsInterPart?: TaxNumber;
  pFcpUfDest?: TaxNumber;
  difalCalculation?: string | null;
  qBcMono?: TaxNumber;
  adRemIcms?: TaxNumber;
  pIpi?: TaxNumber;
  qUnidIpi?: TaxNumber;
  vUnidIpi?: TaxNumber;
  pPis?: TaxNumber;
  qBcProdPis?: TaxNumber;
  vAliqProdPis?: TaxNumber;
  pCofins?: TaxNumber;
  qBcProdCofins?: TaxNumber;
  vAliqProdCofins?: TaxNumber;
  pIssqn?: TaxNumber;
  vBcIssqn?: TaxNumber;
  pIs?: TaxNumber;
  vBcIs?: TaxNumber;
  vBcIbsCbs?: TaxNumber;
  pIbsUf?: TaxNumber;
  pRedIbsUf?: TaxNumber;
  pIbsMun?: TaxNumber;
  pRedIbsMun?: TaxNumber;
  pCbs?: TaxNumber;
  pRedCbs?: TaxNumber;
};

export type CalculatedItemTax = {
  vBc: number;
  vIcms: number;
  vIcmsDeson: number;
  vIcmsDesonDeduzido: number;
  vFcp: number;
  vIpi: number;
  ipiVBc: number | null;
  vBcSt: number | null;
  vIcmsSt: number;
  vBcUfDest: number | null;
  vBcFcpUfDest: number | null;
  vIcmsUfDest: number;
  vIcmsUfRemet: number;
  vFcpUfDest: number;
  vIcmsMono: number;
  pisVBc: number | null;
  vPis: number;
  cofinsVBc: number | null;
  vCofins: number;
  issqnVBc: number | null;
  vIssqn: number;
  vBcIs: number | null;
  vIs: number;
  vBcIbsCbs: number | null;
  pAliqEfetIbsUf: number | null;
  vIbsUf: number;
  pAliqEfetIbsMun: number | null;
  vIbsMun: number;
  vIbs: number;
  pAliqEfetCbs: number | null;
  vCbs: number;
  vTotTrib: number;
};

export type InvoiceTotals = {
  vBc: number;
  vIcms: number;
  vIcmsDeson: number;
  vFcp: number;
  vBcSt: number;
  vSt: number;
  vProd: number;
  vFrete: number;
  vSeg: number;
  vDesc: number;
  vOutro: number;
  vIi: number;
  vIpi: number;
  vPis: number;
  vCofins: number;
  vIcmsUfDest: number;
  vIcmsUfRemet: number;
  vFcpUfDest: number;
  vIcmsMono: number;
  vIs: number;
  vBcIbsCbs: number;
  vIbsUf: number;
  vIbsMun: number;
  vIbs: number;
  vCbs: number;
  vNf: number;
  vNfTot: number;
  vTotTrib: number;
};

export const asNumber = (value: TaxNumber): number => {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const roundMoney = (value: number): number =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const hasValue = (value: TaxNumber): boolean =>
  value !== null && value !== undefined && value !== "";

const percentOf = (base: number, rate: number): number =>
  roundMoney((base * rate) / 100);

const effectiveRate = (rate: TaxNumber, reduction: TaxNumber): number =>
  Math.round(asNumber(rate) * (1 - asNumber(reduction) / 100) * 10000) / 10000;

// CSTs sem ICMS proprio destacado (sem vBC/vICMS no grupo do XML).
export const ICMS_CST_WITHOUT_OWN_ICMS = new Set(["30", "40", "41", "50", "60"]);
// Desoneracao pelo ICMS integral (30/40/41/50) ou pela reducao da base (20/70).
const ICMS_CST_FULL_DESON = new Set(["30", "40", "41", "50"]);
const ICMS_CST_REDUCTION_DESON = new Set(["20", "70"]);
export const ICMS_CST_WITH_DESON = new Set([
  ...ICMS_CST_FULL_DESON,
  ...ICMS_CST_REDUCTION_DESON,
]);

export const calculateItemTax = (
  amounts: TaxItemAmounts,
  rates: TaxRateInput,
): CalculatedItemTax => {
  const vProd = asNumber(amounts.vProd);
  let fullBase = roundMoney(
    vProd +
      asNumber(amounts.vFrete) +
      asNumber(amounts.vSeg) +
      asNumber(amounts.vOutro) -
      asNumber(amounts.vDesc),
  );
  if (fullBase < 0) fullBase = 0;
  const icmsCst = rates.icmsCst ?? undefined;
  const withoutOwnIcms = icmsCst !== undefined && ICMS_CST_WITHOUT_OWN_ICMS.has(icmsCst);

  let vBc = fullBase;
  if (withoutOwnIcms) {
    vBc = 0;
  } else if (hasValue(rates.pRedBc)) {
    vBc = roundMoney(fullBase * (1 - asNumber(rates.pRedBc) / 100));
  }

  const vIcms =
    !withoutOwnIcms && hasValue(rates.pIcms) ? percentOf(vBc, asNumber(rates.pIcms)) : 0;
  const vFcp =
    !withoutOwnIcms && hasValue(rates.pFcp) ? percentOf(vBc, asNumber(rates.pFcp)) : 0;

  let vIcmsDeson = 0;
  if (icmsCst !== undefined && hasValue(rates.pIcms)) {
    const fullIcms = percentOf(fullBase, asNumber(rates.pIcms));
    if (ICMS_CST_FULL_DESON.has(icmsCst)) {
      vIcmsDeson = fullIcms;
    } else if (ICMS_CST_REDUCTION_DESON.has(icmsCst) && asNumber(rates.pRedBc) > 0) {
      vIcmsDeson = roundMoney(Math.max(0, fullIcms - vIcms));
    }
  }
  const vIcmsDesonDeduzido = rates.indDeduzDeson === "1" ? vIcmsDeson : 0;

  let vIpi = 0;
  let ipiVBc: number | null = null;
  if (hasValue(rates.qUnidIpi) && hasValue(rates.vUnidIpi)) {
    vIpi = roundMoney(asNumber(rates.qUnidIpi) * asNumber(rates.vUnidIpi));
  } else if (hasValue(rates.pIpi)) {
    ipiVBc = fullBase;
    vIpi = percentOf(fullBase, asNumber(rates.pIpi));
  }

  let vBcSt: number | null = null;
  let vIcmsSt = 0;
  if (hasValue(rates.pIcmsSt) && hasValue(rates.pMvaSt)) {
    let baseSt = roundMoney((fullBase + vIpi) * (1 + asNumber(rates.pMvaSt) / 100));
    if (hasValue(rates.pRedBcSt)) {
      baseSt = roundMoney(baseSt * (1 - asNumber(rates.pRedBcSt) / 100));
    }
    vBcSt = baseSt;
    vIcmsSt = roundMoney(percentOf(baseSt, asNumber(rates.pIcmsSt)) - vIcms);
    if (vIcmsSt < 0) vIcmsSt = 0;
  }

  let vBcUfDest: number | null = null;
  let vBcFcpUfDest: number | null = null;
  let vIcmsUfDest = 0;
  let vIcmsUfRemet = 0;
  let vFcpUfDest = 0;
  if (hasValue(rates.pIcmsUfDest) && hasValue(rates.pIcmsInter)) {
    const pDest = asNumber(rates.pIcmsUfDest);
    const pInter = asNumber(rates.pIcmsInter);
    const pFcpDest = asNumber(rates.pFcpUfDest);
    let share: number;
    if (rates.difalCalculation === "2") {
      // Base dupla (por dentro): tira o ICMS da origem e embute a aliquota interna + FCP do destino.
      const icmsOrigin = percentOf(vBc, pInter);
      const divisor = 1 - (pDest + pFcpDest) / 100;
      vBcUfDest = divisor > 0 ? roundMoney((vBc - icmsOrigin) / divisor) : vBc;
      share = roundMoney(Math.max(0, percentOf(vBcUfDest, pDest) - icmsOrigin));
    } else {
      vBcUfDest = vBc;
      share = percentOf(vBc, pDest - pInter);
    }
    const part = hasValue(rates.pIcmsInterPart)
      ? asNumber(rates.pIcmsInterPart)
      : 100;
    vIcmsUfDest = roundMoney((share * part) / 100);
    vIcmsUfRemet = roundMoney(share - vIcmsUfDest);
    if (hasValue(rates.pFcpUfDest)) {
      vBcFcpUfDest = vBcUfDest;
      vFcpUfDest = percentOf(vBcUfDest, pFcpDest);
    }
  }

  const vIcmsMono =
    hasValue(rates.qBcMono) && hasValue(rates.adRemIcms)
      ? roundMoney(asNumber(rates.qBcMono) * asNumber(rates.adRemIcms))
      : 0;

  let pisVBc: number | null = null;
  let vPis = 0;
  if (hasValue(rates.qBcProdPis) && hasValue(rates.vAliqProdPis)) {
    vPis = roundMoney(asNumber(rates.qBcProdPis) * asNumber(rates.vAliqProdPis));
  } else if (hasValue(rates.pPis)) {
    pisVBc = fullBase;
    vPis = percentOf(fullBase, asNumber(rates.pPis));
  }

  let cofinsVBc: number | null = null;
  let vCofins = 0;
  if (hasValue(rates.qBcProdCofins) && hasValue(rates.vAliqProdCofins)) {
    vCofins = roundMoney(
      asNumber(rates.qBcProdCofins) * asNumber(rates.vAliqProdCofins),
    );
  } else if (hasValue(rates.pCofins)) {
    cofinsVBc = fullBase;
    vCofins = percentOf(fullBase, asNumber(rates.pCofins));
  }

  let issqnVBc: number | null = null;
  let vIssqn = 0;
  if (hasValue(rates.pIssqn)) {
    issqnVBc = hasValue(rates.vBcIssqn) ? asNumber(rates.vBcIssqn) : vProd;
    vIssqn = percentOf(issqnVBc, asNumber(rates.pIssqn));
  }

  let vBcIs: number | null = null;
  let vIs = 0;
  if (hasValue(rates.pIs)) {
    vBcIs = hasValue(rates.vBcIs) ? asNumber(rates.vBcIs) : fullBase;
    vIs = percentOf(vBcIs, asNumber(rates.pIs));
  }

  const vBcIbsCbs =
    hasValue(rates.pIbsUf) || hasValue(rates.pIbsMun) || hasValue(rates.pCbs)
      ? hasValue(rates.vBcIbsCbs)
        ? asNumber(rates.vBcIbsCbs)
        : fullBase
      : null;

  const pAliqEfetIbsUf = hasValue(rates.pIbsUf)
    ? effectiveRate(rates.pIbsUf, rates.pRedIbsUf)
    : null;
  const vIbsUf =
    vBcIbsCbs !== null && pAliqEfetIbsUf !== null
      ? percentOf(vBcIbsCbs, pAliqEfetIbsUf)
      : 0;
  const pAliqEfetIbsMun = hasValue(rates.pIbsMun)
    ? effectiveRate(rates.pIbsMun, rates.pRedIbsMun)
    : null;
  const vIbsMun =
    vBcIbsCbs !== null && pAliqEfetIbsMun !== null
      ? percentOf(vBcIbsCbs, pAliqEfetIbsMun)
      : 0;
  const vIbs = roundMoney(vIbsUf + vIbsMun);
  const pAliqEfetCbs = hasValue(rates.pCbs)
    ? effectiveRate(rates.pCbs, rates.pRedCbs)
    : null;
  const vCbs =
    vBcIbsCbs !== null && pAliqEfetCbs !== null
      ? percentOf(vBcIbsCbs, pAliqEfetCbs)
      : 0;

  const vTotTrib = roundMoney(
    vIcms +
      vFcp +
      vIcmsSt +
      vIpi +
      vPis +
      vCofins +
      vIssqn +
      vIs +
      vIbs +
      vCbs +
      vIcmsMono,
  );

  return {
    vBc,
    vIcms,
    vIcmsDeson,
    vIcmsDesonDeduzido,
    vFcp,
    vIpi,
    ipiVBc,
    vBcSt,
    vIcmsSt,
    vBcUfDest,
    vBcFcpUfDest,
    vIcmsUfDest,
    vIcmsUfRemet,
    vFcpUfDest,
    vIcmsMono,
    pisVBc,
    vPis,
    cofinsVBc,
    vCofins,
    issqnVBc,
    vIssqn,
    vBcIs,
    vIs,
    vBcIbsCbs,
    pAliqEfetIbsUf,
    vIbsUf,
    pAliqEfetIbsMun,
    vIbsMun,
    vIbs,
    pAliqEfetCbs,
    vCbs,
    vTotTrib,
  };
};

export const sumInvoiceTotals = (
  items: Array<{ amounts: TaxItemAmounts; tax: CalculatedItemTax }>,
): InvoiceTotals => {
  let desonDeduzido = 0;
  const totals = items.reduce<InvoiceTotals>(
    (acc, item) => {
      acc.vBc = roundMoney(acc.vBc + item.tax.vBc);
      acc.vIcms = roundMoney(acc.vIcms + item.tax.vIcms);
      acc.vIcmsDeson = roundMoney(acc.vIcmsDeson + item.tax.vIcmsDeson);
      desonDeduzido = roundMoney(desonDeduzido + item.tax.vIcmsDesonDeduzido);
      acc.vFcp = roundMoney(acc.vFcp + item.tax.vFcp);
      acc.vBcSt = roundMoney(acc.vBcSt + (item.tax.vBcSt ?? 0));
      acc.vSt = roundMoney(acc.vSt + item.tax.vIcmsSt);
      acc.vProd = roundMoney(acc.vProd + asNumber(item.amounts.vProd));
      acc.vFrete = roundMoney(acc.vFrete + asNumber(item.amounts.vFrete));
      acc.vSeg = roundMoney(acc.vSeg + asNumber(item.amounts.vSeg));
      acc.vDesc = roundMoney(acc.vDesc + asNumber(item.amounts.vDesc));
      acc.vOutro = roundMoney(acc.vOutro + asNumber(item.amounts.vOutro));
      acc.vIi = roundMoney(acc.vIi + asNumber(item.amounts.vIi));
      acc.vIpi = roundMoney(acc.vIpi + item.tax.vIpi);
      acc.vPis = roundMoney(acc.vPis + item.tax.vPis);
      acc.vCofins = roundMoney(acc.vCofins + item.tax.vCofins);
      acc.vIcmsUfDest = roundMoney(acc.vIcmsUfDest + item.tax.vIcmsUfDest);
      acc.vIcmsUfRemet = roundMoney(acc.vIcmsUfRemet + item.tax.vIcmsUfRemet);
      acc.vFcpUfDest = roundMoney(acc.vFcpUfDest + item.tax.vFcpUfDest);
      acc.vIcmsMono = roundMoney(acc.vIcmsMono + item.tax.vIcmsMono);
      acc.vIs = roundMoney(acc.vIs + item.tax.vIs);
      acc.vBcIbsCbs = roundMoney(acc.vBcIbsCbs + (item.tax.vBcIbsCbs ?? 0));
      acc.vIbsUf = roundMoney(acc.vIbsUf + item.tax.vIbsUf);
      acc.vIbsMun = roundMoney(acc.vIbsMun + item.tax.vIbsMun);
      acc.vIbs = roundMoney(acc.vIbs + item.tax.vIbs);
      acc.vCbs = roundMoney(acc.vCbs + item.tax.vCbs);
      acc.vTotTrib = roundMoney(acc.vTotTrib + item.tax.vTotTrib);
      return acc;
    },
    {
      vBc: 0,
      vIcms: 0,
      vIcmsDeson: 0,
      vFcp: 0,
      vBcSt: 0,
      vSt: 0,
      vProd: 0,
      vFrete: 0,
      vSeg: 0,
      vDesc: 0,
      vOutro: 0,
      vIi: 0,
      vIpi: 0,
      vPis: 0,
      vCofins: 0,
      vIcmsUfDest: 0,
      vIcmsUfRemet: 0,
      vFcpUfDest: 0,
      vIcmsMono: 0,
      vIs: 0,
      vBcIbsCbs: 0,
      vIbsUf: 0,
      vIbsMun: 0,
      vIbs: 0,
      vCbs: 0,
      vNf: 0,
      vNfTot: 0,
      vTotTrib: 0,
    },
  );

  totals.vNf = roundMoney(
    totals.vProd -
      totals.vDesc +
      totals.vFrete +
      totals.vSeg +
      totals.vOutro +
      totals.vSt +
      totals.vIi +
      totals.vIpi -
      desonDeduzido,
  );
  totals.vNfTot = roundMoney(
    totals.vNf + totals.vIs + totals.vIbs + totals.vCbs,
  );
  return totals;
};
