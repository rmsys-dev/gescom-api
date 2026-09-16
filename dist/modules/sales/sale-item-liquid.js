const roundMoney = (value) => Math.round(value * 100) / 100;
/** Mesmo código de `PRODUCT_TYPE_SERVICE_CODE` — sem importar o módulo que acessa o banco. */
const SERVICE_TYPE_CODE = "09";
const isServiceItem = (item) => item.isService === true || item.typeCode === SERVICE_TYPE_CODE;
const itemGross = (item) => item.quantity * item.valueUnit;
/**
 * Rateia o desconto/acréscimo final do cabeçalho pelo bruto do item sobre o subTotal.
 * valueLiquidItemsHeader = valueTotal − proporção × descontoFinal + proporção × acresceFinal.
 * Serviço (tipo 09) permanece 0 — não entra em devolução.
 */
export const allocateValueLiquidItemsHeader = (items, header) => {
    const pieItems = items.filter((item) => !isServiceItem(item));
    const byId = new Map();
    for (const item of items) {
        if (isServiceItem(item))
            byId.set(item.id, 0);
    }
    const subTotal = header.subTotal;
    if (subTotal <= 0 || pieItems.length === 0) {
        for (const item of pieItems) {
            byId.set(item.id, 0);
        }
        return items.map((item) => ({
            id: item.id,
            valueLiquidItemsHeader: byId.get(item.id) ?? 0,
        }));
    }
    const pieGross = pieItems.reduce((sum, item) => sum + itemGross(item), 0);
    const pieNet = pieItems.reduce((sum, item) => sum + item.valueTotal, 0);
    const pieShare = pieGross / subTotal;
    const target = roundMoney(Math.max(0, pieNet -
        header.valueDiscountFinancial * pieShare +
        header.valueAcresceFinancial * pieShare));
    let allocated = 0;
    pieItems.forEach((item, index) => {
        const isLast = index === pieItems.length - 1;
        if (isLast) {
            byId.set(item.id, roundMoney(Math.max(0, target - allocated)));
            return;
        }
        const share = itemGross(item) / subTotal;
        const liquid = roundMoney(Math.max(0, item.valueTotal -
            header.valueDiscountFinancial * share +
            header.valueAcresceFinancial * share));
        byId.set(item.id, liquid);
        allocated += liquid;
    });
    return items.map((item) => ({
        id: item.id,
        valueLiquidItemsHeader: byId.get(item.id) ?? 0,
    }));
};
