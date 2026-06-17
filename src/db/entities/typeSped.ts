import { boolean, uuid } from "drizzle-orm/pg-core";
import { tz } from "../functions.js";
import { pgTable, varchar, uniqueIndex } from "drizzle-orm/pg-core";

export const typeSped = pgTable(
  "type_sped",
  {
    id: uuid("id").defaultRandom().primaryKey(),    
    type: varchar("type", { length: 255 }).notNull(), 
    description: varchar("description", { length: 255 }).notNull(),
    generateInventory: boolean("generate_inventory").notNull().default(true), // se gera inventário.
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [uniqueIndex("type_sped_type_active_unique").on(t.type)],
);