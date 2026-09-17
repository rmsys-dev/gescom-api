export function saleItemStockOutRef(saleId: string, saleItemId: string) {
  return `SALE:${saleId}:ITEM:${saleItemId}`;
}

export function saleItemStockReturnRef(saleId: string, saleItemId: string) {
  return `SALE-RETURN:${saleId}:ITEM:${saleItemId}`;
}

export function saleItemStockRevisionOutRef(
  saleId: string,
  saleItemId: string,
  revision: number,
) {
  return `SALE:${saleId}:ITEM:${saleItemId}:REV:${revision}`;
}

export function saleItemStockRevisionReturnRef(
  saleId: string,
  saleItemId: string,
  revision: number,
) {
  return `SALE-RETURN:${saleId}:ITEM:${saleItemId}:REV:${revision}`;
}
