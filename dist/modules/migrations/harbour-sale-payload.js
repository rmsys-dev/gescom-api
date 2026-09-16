const OMITTED_SALE_KEYS = new Set(["user", "seller", "memberRef"]);
const OMITTED_ITEM_KEYS = new Set(["user", "seller", "productCode"]);
const readProductCode = (item) => {
    if (typeof item.productCode === "number")
        return item.productCode;
    if (item.productCode === null)
        return null;
    const productsEnterprises = item.productsEnterprises;
    if (productsEnterprises &&
        typeof productsEnterprises === "object" &&
        "code" in productsEnterprises) {
        const nested = productsEnterprises.code;
        return typeof nested === "number" ? nested : null;
    }
    return null;
};
const shapeHarbourItem = (item) => {
    const code = readProductCode(item);
    const shaped = {};
    for (const [key, value] of Object.entries(item)) {
        if (key === "productsEnterprises") {
            shaped.code = code;
            continue;
        }
        if (OMITTED_ITEM_KEYS.has(key))
            continue;
        shaped[key] = value;
    }
    if (!Object.prototype.hasOwnProperty.call(shaped, "code")) {
        shaped.code = code;
    }
    return shaped;
};
export const applyMemberCodes = (sales, codesByMemberId) => sales.map((sale) => {
    const code = codesByMemberId.get(sale.memberId) ?? null;
    const shaped = {};
    for (const [key, value] of Object.entries(sale)) {
        if (OMITTED_SALE_KEYS.has(key))
            continue;
        if (key === "memberId") {
            shaped.code = code;
        }
        if (key === "member" && value && typeof value === "object") {
            shaped.member = { ...value, code };
            continue;
        }
        if (key === "items" && Array.isArray(value)) {
            shaped.items = value.map((item) => item && typeof item === "object"
                ? shapeHarbourItem(item)
                : item);
            continue;
        }
        shaped[key] = value;
    }
    if (!Object.prototype.hasOwnProperty.call(shaped, "code")) {
        shaped.code = code;
    }
    return shaped;
});
export const collectGeneratedSaleIdsNeedingPayments = (sales) => {
    const ids = new Set();
    for (const sale of sales) {
        if (sale.payments.length > 0)
            continue;
        for (const generated of sale.generatedSales ?? []) {
            ids.add(generated.id);
        }
    }
    return [...ids];
};
export const applyGeneratedPayments = (sales, paymentsBySaleId) => sales.map((sale) => {
    if (sale.payments.length > 0)
        return sale;
    const generatedIds = (sale.generatedSales ?? []).map((generated) => generated.id);
    if (generatedIds.length === 0)
        return sale;
    const payments = generatedIds.flatMap((id) => paymentsBySaleId.get(id) ?? []);
    return { ...sale, payments };
});
