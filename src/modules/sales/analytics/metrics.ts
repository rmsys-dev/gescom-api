export const roundMoney = (value: number) => Math.round(value * 100) / 100;

export const decNum = (value: string | null | undefined) =>
  value !== null && value !== undefined && value !== "" ? Number(value) : 0;

export const deltaPercent = (current: number, previous: number): number => {
  if (previous === 0) {
    return current === 0 ? 0 : 100;
  }
  return roundMoney(((current - previous) / previous) * 100);
};

export const ratePercent = (part: number, total: number) =>
  total > 0 ? roundMoney((part / total) * 100) : 0;

export type KpiValue = {
  value: number;
  previousValue?: number;
  /** Variacao absoluta (value - previousValue). */
  changeAbsolute?: number;
  changePercent?: number;
};

export const kpiWithComparison = (
  value: number,
  previousValue?: number,
): KpiValue => {
  const rounded = roundMoney(value);
  if (previousValue === undefined) {
    return { value: rounded };
  }
  const prev = roundMoney(previousValue);
  return {
    value: rounded,
    previousValue: prev,
    changeAbsolute: roundMoney(rounded - prev),
    changePercent: deltaPercent(value, previousValue),
  };
};

export const sharePercent = (part: number, total: number) =>
  ratePercent(part, total);

/** Payload de ranking pronto para pizza/barra (share sobre o universo filtrado). */
export const buildRankingPayload = <
  T extends { revenue: number; sharePercent?: number },
>(
  items: T[],
  universeTotal: number,
) => {
  const totalRevenue = roundMoney(universeTotal);
  const itemsRevenue = roundMoney(
    items.reduce((sum, item) => sum + item.revenue, 0),
  );
  const remainingRevenue = roundMoney(Math.max(0, totalRevenue - itemsRevenue));
  const withShare = items.map((item) => ({
    ...item,
    sharePercent: sharePercent(item.revenue, totalRevenue),
  }));

  return {
    items: withShare,
    totalRevenue,
    itemsRevenue,
    remainingRevenue,
    remainingSharePercent: sharePercent(remainingRevenue, totalRevenue),
    ...(remainingRevenue > 0
      ? {
          others: {
            label: "Outros",
            revenue: remainingRevenue,
            sharePercent: sharePercent(remainingRevenue, totalRevenue),
          },
        }
      : {}),
  };
};

