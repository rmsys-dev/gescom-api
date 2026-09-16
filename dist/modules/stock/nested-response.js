export const locationDetailWith = {
    sector: true,
};
export const stockBatchDetailWith = {
    productsEnterprises: true,
};
export function toLocationResponse(row) {
    const { sectorId: _sectorId, sector, ...rest } = row;
    return {
        ...rest,
        sector,
    };
}
export function toStockBatchResponse(row) {
    const { productsEnterprisesId: _productsEnterprisesId, productsEnterprises: productsEnterprisesRow, ...rest } = row;
    return {
        ...rest,
        productsEnterprises: productsEnterprisesRow,
    };
}
