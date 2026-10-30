const roundMoney = (value: number) => Math.round(value * 100) / 100;

/** Mesmo código de `PRODUCT_TYPE_SERVICE_CODE` — sem importar o módulo que acessa o banco. */
const SERVICE_TYPE_CODE = "09";

export type SaleItemLiquidAllocInput = {
  id: string;
  quantity: number;
  valueUnit: number;
  valueTotal: number;
  typeCode?: string | null;
  isService?: boolean;
};

export type SaleHeaderLiquidFinancials = {
  subTotal: number;
  valueDiscountFinancial: number;
  valueAcresceFinancial: number;
};

export type SaleItemLiquidAllocResult = {
  id: string;
  valueLiquidItemsHeader: number;
};

const isServiceItem = (item: SaleItemLiquidAllocInput) =>
  item.isService === true || item.typeCode === SERVICE_TYPE_CODE;

const itemGross = (item: SaleItemLiquidAllocInput) =>
  item.quantity * item.valueUnit;

/**
 * Rateia o desconto/acréscimo final do cabeçalho pelo bruto do item sobre o subTotal.
 * valueLiquidItemsHeader = valueTotal − proporção × descontoFinal + proporção × acresceFinal.
 * Serviço (tipo 09) permanece 0 — não entra em devolução.
 */
export const allocateValueLiquidItemsHeader = (
  items: SaleItemLiquidAllocInput[],
  header: SaleHeaderLiquidFinancials,
): SaleItemLiquidAllocResult[] => {
  const pieItems = items.filter((item) => !isServiceItem(item));
  const byId = new Map<string, number>();
  for (const item of items) {
    if (isServiceItem(item)) byId.set(item.id, 0);
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
  const target = roundMoney(
    Math.max(
      0,
      pieNet -
        header.valueDiscountFinancial * pieShare +
        header.valueAcresceFinancial * pieShare,
    ),
  );

  let allocated = 0;
  pieItems.forEach((item, index) => {
    const isLast = index === pieItems.length - 1;
    if (isLast) {
      byId.set(item.id, roundMoney(Math.max(0, target - allocated)));
      return;
    }

    const share = itemGross(item) / subTotal;
    const liquid = roundMoney(
      Math.max(
        0,
        item.valueTotal -
          header.valueDiscountFinancial * share +
          header.valueAcresceFinancial * share,
      ),
    );
    byId.set(item.id, liquid);
    allocated += liquid;
  });

  return items.map((item) => ({
    id: item.id,
    valueLiquidItemsHeader: byId.get(item.id) ?? 0,
  }));
};
