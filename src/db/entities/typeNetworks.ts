import { sql } from "drizzle-orm";
import { pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { statusEnum } from "../enums.js";
import { tz } from "../functions.js";


//Tabela de tipos de redes sociais
export const typeNetworks = pgTable(
  "type_networks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    description: varchar("description", { length: 255 }).notNull(),  // Descrição
    status: statusEnum("status").default("ATIVO").notNull(),  // Status
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("type_networks_description_active_unique")
      .on(t.description)
  ],
);