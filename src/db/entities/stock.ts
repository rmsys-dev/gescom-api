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
  stockBatchStatusEnum,
  stockMovementTypeEnum,
} from "../enums.js";
import { productsEnterprises } from "./products.js";
import { users } from "./users.js"; 
import { tz, valorQuatroCasasDecimais } from "../functions.js";
import { sectors } from "./sector.js";
import { locations } from "./sector.js";
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

// SALDO POR LOTE + LOCAÇÃO
export const stockBatchBalances = pgTable(
  "stock_batch_balances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    stockBatchId: uuid("stock_batch_id") // LOTE
      .notNull()
      .references(() => stockBatches.id, { onDelete: "restrict" }),
    locationsId: uuid("locations_id") // LOCAÇÃO
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    quantity: decimal("quantity", { precision: 14, scale: 4 }).notNull(), // QUANTIDADE
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("batch_balances_batch_locations_unique").on(
      // INDEX ÚNICO DE LOTE E LOCAÇÃO
      t.stockBatchId,
      t.locationsId,
    ),
    check(
      "batch_balances_quantity_non_negative", // VERIFICA SE A QUANTIDADE É NÃO NEGATIVA
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
    fromSectorId: uuid("from_sector_id").references(
      // SETOR DE ORIGEM
      () => sectors.id,
      { onDelete: "restrict" },
    ),
    fromLocationsId: uuid("from_locations_id").references(
      // LOCAÇÃO DE ORIGEM
      () => locations.id,
      { onDelete: "restrict" },
    ),
    fromStockBatchId: uuid("from_stock_batch_id").references(
      () => stockBatches.id,
      {
        // LOTE DE ORIGEM
        onDelete: "restrict",
      },
    ),
    toSectorId: uuid("to_sector_id").references(
      // SETOR DE DESTINO
      () => sectors.id,
      { onDelete: "restrict" },
    ),
    toLocationsId: uuid("to_locations_id").references(
      // LOCAÇÃO DE DESTINO
      () => locations.id,
      { onDelete: "restrict" },
    ),
    toStockBatchId: uuid("to_stock_batch_id").references(
      () => stockBatches.id,
      {
        // LOTE DE DESTINO
        onDelete: "restrict",
      },
    ),
    quantity: decimal("quantity", valorQuatroCasasDecimais).notNull(), // QUANTIDADE MOVIMENTADA
    fromQuantityBefore: decimal(
      "from_quantity_before",
      valorQuatroCasasDecimais,
    ), // QUANTIDADE ANTES DO MOVIMENTO
    fromQuantityAfter: decimal("from_quantity_after", valorQuatroCasasDecimais), // QUANTIDADE DEPOIS DO MOVIMENTO
    toQuantityBefore: decimal("to_quantity_before", valorQuatroCasasDecimais), // QUANTIDADE ANTES DO MOVIMENTO
    toQuantityAfter: decimal("to_quantity_after", valorQuatroCasasDecimais), // QUANTIDADE DEPOIS DO MOVIMENTO
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
    index("stock_movements_from_sector_idx").on(t.fromSectorId), // INDEX DE SETOR DE ORIGEM
    index("stock_movements_to_sector_idx").on(t.toSectorId), // INDEX DE SETOR DE DESTINO
    index("stock_movements_from_locations_idx").on(t.fromLocationsId),
    index("stock_movements_to_locations_idx").on(t.toLocationsId),
    index("stock_movements_from_batch_idx").on(t.fromStockBatchId),
    index("stock_movements_to_batch_idx").on(t.toStockBatchId),
    check(
      "stock_movements_quantity_positive", // VERIFICA SE A QUANTIDADE É POSITIVA
      sql`${t.quantity} > 0`,
    ),
    check(
      "stock_movements_transfer_requires_sectors",
      sql`${t.type} <> 'TRANSFERENCIA' OR (${t.fromSectorId} IS NOT NULL AND ${t.toSectorId} IS NOT NULL)`,
    ),
    check(
      "stock_movements_transfer_requires_locations",
      sql`${t.type} <> 'TRANSFERENCIA' OR (${t.fromLocationsId} IS NOT NULL AND ${t.toLocationsId} IS NOT NULL AND ${t.fromLocationsId} <> ${t.toLocationsId})`,
    ),
    check(
      "stock_movements_transfer_requires_batches",
      sql`${t.type} <> 'TRANSFERENCIA' OR (${t.fromStockBatchId} IS NOT NULL AND ${t.toStockBatchId} IS NOT NULL AND ${t.fromStockBatchId} <> ${t.toStockBatchId} AND ${t.fromStockBatchId} IS NOT NULL AND ${t.toStockBatchId} IS NOT NULL)`,
    ),
    check(
      "stock_movements_transfer_requires_locations_and_batches",
      sql`${t.type} <> 'TRANSFERENCIA' OR (${t.fromLocationsId} IS NOT NULL AND ${t.toLocationsId} IS NOT NULL AND ${t.fromStockBatchId} IS NOT NULL AND ${t.toStockBatchId} IS NOT NULL AND ${t.fromLocationsId} <> ${t.toLocationsId} AND ${t.fromStockBatchId} <> ${t.toStockBatchId} AND ${t.fromLocationsId} IS NOT NULL AND ${t.toLocationsId} IS NOT NULL)`,
    ),
  ],
);
