import { relations } from "drizzle-orm";
import { productsEnterprises } from "../entities/products.js";
import { locations, sectors } from "../entities/sector.js";
import {
  stockBatchBalances,
  stockBatches,
  stockMinMax,
  stockMovements,
} from "../entities/stock.js";
import { users } from "../entities/users.js";

export const stockBatchesRelations = relations(
  stockBatches,
  ({ one, many }) => ({
    productsEnterprises: one(productsEnterprises, {
      fields: [stockBatches.productsEnterprisesId],
      references: [productsEnterprises.id],
    }),
    balances: many(stockBatchBalances),
    movementsFrom: many(stockMovements, {
      relationName: "stockMovementsFromBatch",
    }),
    movementsTo: many(stockMovements, {
      relationName: "stockMovementsToBatch",
    }),
  }),
);

export const stockBatchBalancesRelations = relations(
  stockBatchBalances,
  ({ one }) => ({
    stockBatch: one(stockBatches, {
      fields: [stockBatchBalances.stockBatchId],
      references: [stockBatches.id],
    }),
    location: one(locations, {
      fields: [stockBatchBalances.locationsId],
      references: [locations.id],
    }),
  }),
);

export const stockMinMaxRelations = relations(stockMinMax, ({ one }) => ({
  productsEnterprises: one(productsEnterprises, {
    fields: [stockMinMax.productsEnterprisesId],
    references: [productsEnterprises.id],
  }),
}));

export const stockMovementsRelations = relations(stockMovements, ({ one }) => ({
  productsEnterprises: one(productsEnterprises, {
    fields: [stockMovements.productsEnterprisesId],
    references: [productsEnterprises.id],
  }),
  fromSector: one(sectors, {
    fields: [stockMovements.fromSectorId],
    references: [sectors.id],
    relationName: "stockMovementsFromSector",
  }),
  toSector: one(sectors, {
    fields: [stockMovements.toSectorId],
    references: [sectors.id],
    relationName: "stockMovementsToSector",
  }),
  fromLocation: one(locations, {
    fields: [stockMovements.fromLocationsId],
    references: [locations.id],
    relationName: "stockMovementsFromLocation",
  }),
  toLocation: one(locations, {
    fields: [stockMovements.toLocationsId],
    references: [locations.id],
    relationName: "stockMovementsToLocation",
  }),
  fromStockBatch: one(stockBatches, {
    fields: [stockMovements.fromStockBatchId],
    references: [stockBatches.id],
    relationName: "stockMovementsFromBatch",
  }),
  toStockBatch: one(stockBatches, {
    fields: [stockMovements.toStockBatchId],
    references: [stockBatches.id],
    relationName: "stockMovementsToBatch",
  }),
  user: one(users, {
    fields: [stockMovements.userId],
    references: [users.id],
    relationName: "stockMovementsUser",
  }),
}));
