import { index, pgTable, varchar, uuid } from "drizzle-orm/pg-core";
import { enterprises } from "./enterprises.js";
import { tz } from "../functions.js";

//Tabela de sequências de empresas
export const enterprisesSequences = pgTable(
  "enterprises_sequences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "restrict" }),
    sequence: varchar("sequence", { length: 255 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [index("enterprises_sequences_enterprise_idx").on(t.enterpriseId)],
);
