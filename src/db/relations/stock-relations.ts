import { relations } from "drizzle-orm";
import { productsEnterprises } from "../entities/products.js";
import {
  stockBatchBalances,
  stockMinMax,
  stockMovements,
  stockSectors,
  stockLocations,
  stockSectorsRental,
  stockBatches,
} from "../entities/stock.js";
import { users } from "../entities/users.js";

// relações da tabela de ESTOQUE DE SETOR.
export const stockSectorsRelations = relations(stockSectors, ({ many }) => ({
  stockLocations: many(stockLocations), // LOCAÇÕES
  stockSectorsRental: many(stockSectorsRental), // SALDOS POR SETOR DE ESTOQUE
  stockBatchBalances: many(stockBatchBalances), // SALDOS POR LOTE
  movementsFrom: many(stockMovements, {
    relationName: "stockMovementsFromSector",
  }), // MOVIMENTAÇÕES DE ORIGEM
  movementsTo: many(stockMovements, { relationName: "stockMovementsToSector" }), // MOVIMENTAÇÕES DE DESTINO
}));

// relações da tabela de LOCAÇÃO FÍSICA DENTRO DO SETOR.
export const stockLocationsRelations = relations(
  stockLocations,
  ({ one, many }) => ({
    stockSector: one(stockSectors, {
      // SETOR DE ESTOQUE
      fields: [stockLocations.stockSectorId],
      references: [stockSectors.id],
    }),
    balances: many(stockSectorsRental), // SALDOS POR SETOR DE ESTOQUE
    batchBalances: many(stockBatchBalances), // SALDOS POR LOTE
    movementsFrom: many(stockMovements, {
      relationName: "stockMovementsFromLocation",
    }), // MOVIMENTAÇÕES DE ORIGEM
    movementsTo: many(stockMovements, {
      relationName: "stockMovementsToLocation",
    }), // MOVIMENTAÇÕES DE DESTINO
  }),
);

// relações da tabela de LOTE.
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

// relações da tabela de SALDO POR SETOR DE ESTOQUE.
export const stockSectorsRentalRelations = relations(
  stockSectorsRental,
  ({ one }) => ({
    productsEnterprises: one(productsEnterprises, {
      fields: [stockSectorsRental.productsEnterprisesId],
      references: [productsEnterprises.id],
    }),
    stockLocation: one(stockLocations, {
      fields: [stockSectorsRental.stockLocationId],
      references: [stockLocations.id],
    }),
  }),
);

// relações da tabela de SALDO POR LOTE + LOCAÇÃO.
export const stockBatchBalancesRelations = relations(
  stockBatchBalances,
  ({ one, many }) => ({
    stockBatch: one(stockBatches, {
      fields: [stockBatchBalances.stockBatchId],
      references: [stockBatches.id],
    }),
    stockLocation: one(stockLocations, {
      fields: [stockBatchBalances.stockLocationId],
      references: [stockLocations.id],
    }),
    movementsFrom: many(stockMovements, {
      relationName: "stockMovementsFromBatch",
    }),
    movementsTo: many(stockMovements, {
      relationName: "stockMovementsToBatch",
    }),
    balances: many(stockBatchBalances), // SALDOS POR LOTE + LOCAÇÃO
  }),
);

// relações da tabela de ESTOQUE MINIMO E MAXIMO.
export const stockMinMaxRelations = relations(stockMinMax, ({ one, many }) => ({
  // PRODUTO EMPRESA
  productsEnterprises: one(productsEnterprises, {
    fields: [stockMinMax.productsEnterprisesId],
    references: [productsEnterprises.id],
  }),
  stockSectorsRental: many(stockSectorsRental),
  stockBatchBalances: many(stockBatchBalances),
  movementsFrom: many(stockMovements, {
    relationName: "stockMovementsFromMinMax",
  }),
  movementsTo: many(stockMovements, { relationName: "stockMovementsToMinMax" }),
}));

// relações da tabela de HISTÓRICO DE MOVIMENTAÇÃO DE ESTOQUE.
export const stockMovementsRelations = relations(
  stockMovements,
  ({ one, many }) => ({
    productsEnterprises: one(productsEnterprises, {
      fields: [stockMovements.productsEnterprisesId],
      references: [productsEnterprises.id],
    }),
    fromStockSector: one(stockSectors, {
      fields: [stockMovements.fromStockSectorId],
      references: [stockSectors.id],
      relationName: "stockMovementsFromSector",
    }),
    toStockSector: one(stockSectors, {
      fields: [stockMovements.toStockSectorId],
      references: [stockSectors.id],
      relationName: "stockMovementsToSector",
    }),
    fromStockLocation: one(stockLocations, {
      fields: [stockMovements.fromStockLocationId],
      references: [stockLocations.id],
      relationName: "stockMovementsFromLocation",
    }),
    toStockLocation: one(stockLocations, {
      fields: [stockMovements.toStockLocationId],
      references: [stockLocations.id],
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
    stockSectorsRental: many(stockSectorsRental, {
      relationName: "stockMovementsSectorsRental",
    }),
    stockBatchBalances: many(stockBatchBalances, {
      relationName: "stockMovementsBatchBalances",
    }),
  }),
);
