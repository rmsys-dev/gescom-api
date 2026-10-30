import { relations } from "drizzle-orm";
import { productsEnterprises } from "../entities/products.js";
import { enterprises } from "../entities/enterprises.js";
import { locations, sectors, sectorsRental } from "../entities/sector.js";
import { stockBatchBalances, stockMovements } from "../entities/stock.js";

export const sectorsRelations = relations(sectors, ({ one, many }) => ({
  enterprise: one(enterprises, {
    fields: [sectors.enterprisesId],
    references: [enterprises.id],
  }),
  locations: many(locations),
  movementsFrom: many(stockMovements, {
    relationName: "stockMovementsFromSector",
  }),
  movementsTo: many(stockMovements, {
    relationName: "stockMovementsToSector",
  }),
}));

export const locationsRelations = relations(locations, ({ one, many }) => ({
  sector: one(sectors, {
    fields: [locations.sectorId],
    references: [sectors.id],
  }),
  sectorsRental: many(sectorsRental),
  batchBalances: many(stockBatchBalances),
  movementsFrom: many(stockMovements, {
    relationName: "stockMovementsFromLocation",
  }),
  movementsTo: many(stockMovements, {
    relationName: "stockMovementsToLocation",
  }),
}));

export const sectorsRentalRelations = relations(sectorsRental, ({ one }) => ({
  productsEnterprises: one(productsEnterprises, {
    fields: [sectorsRental.productsEnterprisesId],
    references: [productsEnterprises.id],
  }),
  location: one(locations, {
    fields: [sectorsRental.locationsId],
    references: [locations.id],
  }),
}));
