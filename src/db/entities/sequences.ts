import { sql } from "drizzle-orm";
import { integer, pgTable, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { enterprises } from "./enterprises.js";
import { tz } from "../functions.js";
import { sequenceTypeEnum } from "../enums.js";

//Tabela de sequências de empresas
export const enterprisesSequences = pgTable(
  "enterprises_sequences",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "restrict" }),
    type: sequenceTypeEnum("type").notNull(),
    sequence: integer("sequence").notNull().default(0),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("enterprises_sequences_enterprise_type_uidx")
      .on(t.enterpriseId, t.type)
      .where(sql`${t.deletedAt} is null`),
  ],
);
