import type {
  productsEnterprises,
  stockBatches,
  stockLocations,
  stockSectors,
} from "../../db/schema.js";

export type StockLocationWithSector = typeof stockLocations.$inferSelect & {
  stockSector: typeof stockSectors.$inferSelect;
};

export type StockBatchWithProductEnterprise =
  typeof stockBatches.$inferSelect & {
    productsEnterprises: typeof productsEnterprises.$inferSelect;
  };

export const stockLocationDetailWith = {
  stockSector: true,
} as const;

export const stockBatchDetailWith = {
  productsEnterprises: true,
} as const;

export function toStockLocationResponse(row: StockLocationWithSector) {
  const { stockSectorId: _stockSectorId, stockSector, ...rest } = row;
  return {
    ...rest,
    stockSector,
  };
}

export function toStockBatchResponse(row: StockBatchWithProductEnterprise) {
  const {
    productsEnterprisesId: _productsEnterprisesId,
    productsEnterprises: productsEnterprisesRow,
    ...rest
  } = row;
  return {
    ...rest,
    productsEnterprises: productsEnterprisesRow,
  };
}
