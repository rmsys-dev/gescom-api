import {
    pgTable,
    uniqueIndex,
    index,
    uuid,
    varchar,
  } from "drizzle-orm/pg-core";
import { enterprises } from "./enterprises.js";
import { tz } from "../functions.js";
import { productsEnterprises } from "./products.js";
import { statusEnum } from "../enums.js";

// LOCAÇÃO DO PRODUTO
export const locations = pgTable(
  "locations",
  {
      id: uuid("id").defaultRandom().primaryKey(),
      box: varchar("box", { length: 64 }), // BOX DA LOCAÇÃO
      description: varchar("description", { length: 255 }),
      sectorId: uuid("sector_id") // SETOR DE ESTOQUE
      .notNull()
      .references(() => sectors.id, { onDelete: "cascade" }),
      status: statusEnum("status").notNull().default("ATIVO"), // STATUS DA LOCAÇÃO
      createdAt: tz("created_at").defaultNow().notNull(),
      updatedAt: tz("updated_at"),
  },  
  (t) => [
      uniqueIndex("locations_sector_box_unique").on(
      // INDEX ÚNICO DE SETOR DE ESTOQUE E BOX
      t.sectorId,
      t.box,
      ),
      index("locations_sector_idx").on(t.sectorId), // INDEX DE SETOR DE ESTOQUE
      index("locations_box_idx").on(t.box), // INDEX DE BOX
  ],
  );
  
// SETORES
export const sectors = pgTable(
    "sectors",
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
      uniqueIndex("sectors_enterprise_description_unique").on(
        t.enterprisesId,
        t.description,
      ),
      index("sectors_enterprise_idx").on(t.enterprisesId),
    ],
  );
  
  // VÍNCULO PRODUTO + LOCAÇÃO (sem lote; saldo fica em products_enterprises.stock_balance)
export const sectorsRental = pgTable(
  "sectors_rental",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    productsEnterprisesId: uuid("products_enterprises_id") // PRODUTO EMPRESA
      .notNull()
      .references(() => productsEnterprises.id, { onDelete: "restrict" }),
    locationsId: uuid("locations_id") // LOCAÇÃO
      .notNull()
      .references(() => locations.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("sectors_rental_product_location_unique").on(
      // INDEX ÚNICO DE PRODUTO EMPRESA E LOCAÇÃO
      t.productsEnterprisesId,
      t.locationsId,
    ),
  ],
);
