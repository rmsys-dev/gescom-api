import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  decimal,
  index,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { statusEnum } from "../enums.js";
import { enterprises } from "./enterprises.js";
import { tz } from "../functions.js";

export const PRINTER_PAPER_TYPES = ["A4", "BOBINA_80", "BOBINA_58"] as const;
export type PrinterPaperType = (typeof PRINTER_PAPER_TYPES)[number];

// TABELA DE IMPRESSORAS COMPARTILHADAS NA REDE DO CLIENTE ( Por empresa )
export const printers = pgTable(
  "printers",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }), // empresa dona do cadastro
    status: statusEnum("status").notNull().default("ATIVO"), // status da impressora
    description: varchar("description", { length: 255 }).notNull(), // descrição (ex.: Caixa 01 - Bobina)
    computerName: varchar("computer_name", { length: 63 }).notNull(), // nome do computador que compartilha
    shareName: varchar("share_name", { length: 255 }).notNull(), // nome do compartilhamento da impressora
    paperType: varchar("paper_type", { length: 20 }).$type<PrinterPaperType>().notNull().default("A4"), // A4 / bobina
    isDefault: boolean("is_default").notNull().default(false), // impressora padrão da empresa
    // margens extras em mm da impressão em bobina, para ajustar à área útil de cada impressora
    marginTop: decimal("margin_top", { precision: 4, scale: 1 }).notNull().default("0"),
    marginBottom: decimal("margin_bottom", { precision: 4, scale: 1 }).notNull().default("0"),
    marginLeft: decimal("margin_left", { precision: 4, scale: 1 }).notNull().default("0"),
    marginRight: decimal("margin_right", { precision: 4, scale: 1 }).notNull().default("0"),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("printers_enterprise_computer_share_unique").on(
      t.enterprisesId,
      sql`lower(${t.computerName})`,
      sql`lower(${t.shareName})`,
    ),
    uniqueIndex("printers_enterprise_default_unique")
      .on(t.enterprisesId)
      .where(sql`${t.isDefault} = true`),
    index("printers_enterprise_idx").on(t.enterprisesId),
    check("printers_paper_type_chk", sql`${t.paperType} in ('A4', 'BOBINA_80', 'BOBINA_58')`),
  ],
);
