export const roundMoney = (value: number) => Math.round(value * 100) / 100;

export const decNum = (value: string | null | undefined) =>
  value !== null && value !== undefined && value !== "" ? Number(value) : 0;

export const deltaPercent = (current: number, previous: number): number => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return roundMoney(((current - previous) / previous) * 100);
};

export type KpiValue = {
  value: number;
  previousValue?: number;
  changePercent?: number;
};

export const kpiWithComparison = (
  value: number,
  previousValue?: number,
): KpiValue => {
  if (previousValue === undefined) {
    return { value: roundMoney(value) };
  }
  return {
    value: roundMoney(value),
    previousValue: roundMoney(previousValue),
    changePercent: deltaPercent(value, previousValue),
  };
};

export const sharePercent = (part: number, total: number) =>
  total > 0 ? roundMoney((part / total) * 100) : 0;
