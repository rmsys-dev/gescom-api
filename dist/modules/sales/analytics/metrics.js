export const roundMoney = (value) => Math.round(value * 100) / 100;
export const decNum = (value) => value !== null && value !== undefined && value !== "" ? Number(value) : 0;
export const deltaPercent = (current, previous) => {
    if (previous === 0) {
        return current === 0 ? 0 : 100;
    }
    return roundMoney(((current - previous) / previous) * 100);
};
export const ratePercent = (part, total) => total > 0 ? roundMoney((part / total) * 100) : 0;
export const kpiWithComparison = (value, previousValue) => {
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
export const sharePercent = (part, total) => ratePercent(part, total);
/** Payload de ranking pronto para pizza/barra (share sobre o universo filtrado). */
export const buildRankingPayload = (items, universeTotal) => {
    const totalRevenue = roundMoney(universeTotal);
    const itemsRevenue = roundMoney(items.reduce((sum, item) => sum + item.revenue, 0));
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
