export function saleItemStockOutRef(saleId, saleItemId) {
    return `SALE:${saleId}:ITEM:${saleItemId}`;
}
export function saleItemStockReturnRef(saleId, saleItemId) {
    return `SALE-RETURN:${saleId}:ITEM:${saleItemId}`;
}
export function saleItemStockRevisionOutRef(saleId, saleItemId, revision) {
    return `SALE:${saleId}:ITEM:${saleItemId}:REV:${revision}`;
}
export function saleItemStockRevisionReturnRef(saleId, saleItemId, revision) {
    return `SALE-RETURN:${saleId}:ITEM:${saleItemId}:REV:${revision}`;
}
