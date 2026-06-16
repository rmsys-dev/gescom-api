import {
  pgTable,
  uniqueIndex,
  index,
  check,
  uuid,
  varchar,
  date,
  decimal,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  statusEnum,
  stockBatchStatusEnum,
  stockMovementTypeEnum,
} from "../enums.js";
import { productsEnterprises } from "./products.js";
import { enterprises } from "./enterprises.js";
import { users } from "./users.js";
import { tz } from "../functions.js";

// SETOR DE ESTOQUE
export const stockSectors = pgTable(
  "stock_sectors",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    description: varchar("description", { length: 255 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("stock_sectors_enterprise_description_unique").on(
      t.enterprisesId,
      t.description,
    ),
    index("stock_sectors_enterprise_idx").on(t.enterprisesId),
  ],
);

// LOCAÇÃO FÍSICA DENTRO DO SETOR (corredor / prateleira / nível)
export const stockLocations = pgTable(
  "stock_locations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    code: varchar("code", { length: 64 }).notNull(), // CÓDIGO DA LOCAÇÃO
    description: varchar("description", { length: 255 }),
    stockSectorId: uuid("stock_sector_id") // SETOR DE ESTOQUE
      .notNull()
      .references(() => stockSectors.id, { onDelete: "cascade" }),
    status: statusEnum("status").notNull().default("ATIVO"), // STATUS DA LOCAÇÃO
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("stock_locations_sector_code_unique").on(
      // INDEX ÚNICO DE SETOR DE ESTOQUE E CÓDIGO
      t.stockSectorId,
      t.code,
    ),
    index("stock_locations_sector_idx").on(t.stockSectorId), // INDEX DE SETOR DE ESTOQUE
  ],
);

// LOTE (cadastro mestre por produto-empresa).
export const stockBatches = pgTable(
  "stock_batches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    batchNumber: varchar("batch_number", { length: 64 }).notNull(), // NÚMERO DO LOTE
    productsEnterprisesId: uuid("products_enterprises_id") // PRODUTO EMPRESA
      .notNull()
      .references(() => productsEnterprises.id, { onDelete: "restrict" }),
    manufacturingDate: date("manufacturing_date", { mode: "date" }), // DATA DE FABRICAÇÃO
    expiryDate: date("expiry_date", { mode: "date" }), // DATA DE EXPIRAÇÃO
    documentRef: varchar("document_ref", { length: 100 }), // REFERENCIA DO DOCUMENTO
    status: stockBatchStatusEnum("status").notNull().default("ATIVO"), // STATUS DO LOTE
    notes: varchar("notes", { length: 500 }), // NOTAS DO LOTE
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("stock_batches_product_batch_unique").on(
      // INDEX ÚNICO DE PRODUTO EMPRESA E NÚMERO DO LOTE
      t.productsEnterprisesId,
      t.batchNumber,
    ),
    index("stock_batches_expiry_idx").on(t.expiryDate), // INDEX DE DATA DE EXPIRAÇÃO
  ],
);

// SALDO POR PRODUTO + LOCAÇÃO (sem lote)
export const stockSectorsRental = pgTable(
  "stock_sectors_rental",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productsEnterprisesId: uuid("products_enterprises_id") // PRODUTO EMPRESA
      .notNull()
      .references(() => productsEnterprises.id, { onDelete: "restrict" }),
    stockLocationId: uuid("stock_location_id") // LOCAÇÃO
      .notNull()
      .references(() => stockLocations.id, { onDelete: "restrict" }),
    quantity: decimal("quantity", { precision: 14, scale: 4 }).notNull(), // QUANTIDADE
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("stock_sectors_rental_product_location_unique").on(
      // INDEX ÚNICO DE PRODUTO EMPRESA E LOCAÇÃO
      t.productsEnterprisesId,
      t.stockLocationId,
    ),
    check(
      "stock_sectors_rental_quantity_non_negative", // VERIFICA SE A QUANTIDADE É NÃO NEGATIVA
      sql`${t.quantity} >= 0`,
    ),
  ],
);

// SALDO POR LOTE + LOCAÇÃO
export const stockBatchBalances = pgTable(
  "stock_batch_balances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stockBatchId: uuid("stock_batch_id") // LOTE
      .notNull()
      .references(() => stockBatches.id, { onDelete: "restrict" }),
    stockLocationId: uuid("stock_location_id") // LOCAÇÃO
      .notNull()
      .references(() => stockLocations.id, { onDelete: "restrict" }),
    quantity: decimal("quantity", { precision: 14, scale: 4 }).notNull(), // QUANTIDADE
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("stock_batch_balances_batch_location_unique").on(
      // INDEX ÚNICO DE LOTE E LOCAÇÃO
      t.stockBatchId,
      t.stockLocationId,
    ),
    check(
      "stock_batch_balances_quantity_non_negative", // VERIFICA SE A QUANTIDADE É NÃO NEGATIVA
      sql`${t.quantity} >= 0`,
    ),
  ],
);

// ESTOQUE MINIMO E MAXIMO.
export const stockMinMax = pgTable(
  "stock_min_max",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    quantityMin: decimal("quantity_min", { precision: 14, scale: 4 }).notNull(),
    quantityMax: decimal("quantity_max", { precision: 14, scale: 4 }).notNull(),
    productsEnterprisesId: uuid("products_enterprises_id")
      .notNull()
      .references(() => productsEnterprises.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("stock_min_max_products_enterprises_id_unique").on(
      t.productsEnterprisesId,
    ),
  ],
);

// HISTÓRICO DE MOVIMENTAÇÃO DE ESTOQUE.
export const stockMovements = pgTable(
  "stock_movements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    // Agrupa pernas da mesma operação (ex.: mesma transferência).
    transferGroupId: uuid("transfer_group_id").notNull(),

    type: stockMovementTypeEnum("type").notNull(), // ENTRADA, SAIDA, TRANSFERENCIA, AJUSTE, PERDA, VENDA, COMPRA, DEVOLUCAO, CANCELAMENTO, OUTROS
    productsEnterprisesId: uuid("products_enterprises_id")
      .notNull()
      .references(() => productsEnterprises.id, { onDelete: "restrict" }), // PRODUTO EMPRESA
    fromStockSectorId: uuid("from_stock_sector_id").references(
      // SETOR DE ORIGEM
      () => stockSectors.id,
      { onDelete: "restrict" },
    ),
    fromStockLocationId: uuid("from_stock_location_id").references(
      // LOCAÇÃO DE ORIGEM
      () => stockLocations.id,
      { onDelete: "restrict" },
    ),
    fromStockBatchId: uuid("from_stock_batch_id").references(
      () => stockBatches.id,
      {
        // LOTE DE ORIGEM
        onDelete: "restrict",
      },
    ),
    toStockSectorId: uuid("to_stock_sector_id").references(
      // SETOR DE DESTINO
      () => stockSectors.id,
      { onDelete: "restrict" },
    ),
    toStockLocationId: uuid("to_stock_location_id").references(
      // LOCAÇÃO DE DESTINO
      () => stockLocations.id,
      { onDelete: "restrict" },
    ),
    toStockBatchId: uuid("to_stock_batch_id").references(
      () => stockBatches.id,
      {
        // LOTE DE DESTINO
        onDelete: "restrict",
      },
    ),
    quantity: decimal("quantity", { precision: 14, scale: 4 }).notNull(), // QUANTIDADE MOVIMENTADA
    fromQuantityBefore: decimal("from_quantity_before", {
      // QUANTIDADE ANTES DO MOVIMENTO
      precision: 14,
      scale: 4,
    }),
    fromQuantityAfter: decimal("from_quantity_after", {
      // QUANTIDADE DEPOIS DO MOVIMENTO
      precision: 14,
      scale: 4,
    }),
    toQuantityBefore: decimal("to_quantity_before", {
      // QUANTIDADE ANTES DO MOVIMENTO
      precision: 14,
      scale: 4,
    }),
    toQuantityAfter: decimal("to_quantity_after", {
      // QUANTIDADE DEPOIS DO MOVIMENTO
      precision: 14,
      scale: 4,
    }),
    userId: uuid("user_id").references(() => users.id, {
      // USUÁRIO QUE REALIZOU O MOVIMENTO
      onDelete: "set null",
    }),
    notes: varchar("notes", { length: 500 }), // NOTAS DO MOVIMENTO
    documentRef: varchar("document_ref", { length: 100 }), // REFERENCIA DO DOCUMENTO
    createdAt: tz("created_at").defaultNow().notNull(), // DATA DE CRIAÇÃO
  },
  (t) => [
    index("stock_movements_products_enterprises_created_idx").on(
      // INDEX DE PRODUTO EMPRESA E DATA DE CRIAÇÃO
      t.productsEnterprisesId,
      t.createdAt,
    ),
    index("stock_movements_transfer_group_idx").on(t.transferGroupId), // INDEX DE GRUPO DE TRANSFERÊNCIA
    index("stock_movements_from_sector_idx").on(t.fromStockSectorId), // INDEX DE SETOR DE ORIGEM
    index("stock_movements_to_sector_idx").on(t.toStockSectorId), // INDEX DE SETOR DE DESTINO
    index("stock_movements_from_location_idx").on(t.fromStockLocationId),
    index("stock_movements_to_location_idx").on(t.toStockLocationId),
    index("stock_movements_from_batch_idx").on(t.fromStockBatchId),
    index("stock_movements_to_batch_idx").on(t.toStockBatchId),
    check(
      "stock_movements_quantity_positive", // VERIFICA SE A QUANTIDADE É POSITIVA
      sql`${t.quantity} > 0`,
    ),
    check(
      "stock_movements_transfer_requires_sectors",
      sql`${t.type} <> 'TRANSFERENCIA' OR (${t.fromStockSectorId} IS NOT NULL AND ${t.toStockSectorId} IS NOT NULL)`,
    ),
    check(
      "stock_movements_transfer_requires_locations",
      sql`${t.type} <> 'TRANSFERENCIA' OR (${t.fromStockLocationId} IS NOT NULL AND ${t.toStockLocationId} IS NOT NULL AND ${t.fromStockLocationId} <> ${t.toStockLocationId})`,
    ),
    check(
      "stock_movements_transfer_batches_consistent",
      sql`${t.type} <> 'TRANSFERENCIA' OR ((${t.fromStockBatchId} IS NULL AND ${t.toStockBatchId} IS NULL) OR (${t.fromStockBatchId} IS NOT NULL AND ${t.toStockBatchId} IS NOT NULL))`,
    ),
  ],
);
