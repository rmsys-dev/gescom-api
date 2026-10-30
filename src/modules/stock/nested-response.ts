import type {
  productsEnterprises,
  stockBatches,
  locations,
  sectors,
} from "../../db/schema.js";

export type LocationWithSector = typeof locations.$inferSelect & {
  sector: typeof sectors.$inferSelect;
};

export type StockBatchWithProductEnterprise =
  typeof stockBatches.$inferSelect & {
    productsEnterprises: typeof productsEnterprises.$inferSelect;
  };

export const locationDetailWith = {
  sector: true,
} as const;

export const stockBatchDetailWith = {
  productsEnterprises: true,
} as const;

export function toLocationResponse(row: LocationWithSector) {
  const { sectorId: _sectorId, sector, ...rest } = row;
  return {
    ...rest,
    sector,
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
