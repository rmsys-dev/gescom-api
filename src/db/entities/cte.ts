import { sql } from "drizzle-orm";
import { check, decimal, index, pgTable, uniqueIndex, uuid, varchar } from "drizzle-orm/pg-core";
import { enterprises } from "./enterprises.js";
import { tz, percentageDecimal, valorDuasCasasDecimais } from "../functions.js";

/** Cursor da Distribuição DF-e de CT-e. Separado do cursor da NF-e. */
export const cteDfeCursors = pgTable(
  "cte_dfe_cursors",
  {
    enterpriseId: uuid("enterprise_id")
      .primaryKey()
      .references(() => enterprises.id, { onDelete: "restrict" }),
    ultNsu: varchar("ult_nsu", { length: 15 }).notNull().default("000000000000000"),
    maxNsu: varchar("max_nsu", { length: 15 }),
    blockedUntil: tz("blocked_until"),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    check("cte_dfe_cursors_ult_nsu_chk", sql`${t.ultNsu} ~ '^[0-9]{15}$'`),
    check(
      "cte_dfe_cursors_max_nsu_chk",
      sql`${t.maxNsu} is null or ${t.maxNsu} ~ '^[0-9]{15}$'`,
    ),
  ],
);

/** CT-e autorizado recebido na distribuição DF-e. */
export const cteDocuments = pgTable(
  "cte_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    chave: varchar("chave", { length: 44 }).notNull(),
    number: varchar("number", { length: 9 }).notNull(),
    serie: varchar("serie", { length: 3 }).notNull(),
    emitCnpj: varchar("emit_cnpj", { length: 14 }).notNull(),
    emitName: varchar("emit_name", { length: 60 }),
    freightValue: decimal("freight_value", valorDuasCasasDecimais),
    icmsRate: decimal("icms_rate", percentageDecimal),
    icmsValue: decimal("icms_value", valorDuasCasasDecimais),
    xmlArquivo: varchar("xml_arquivo", { length: 512 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("cte_documents_enterprise_chave_unique").on(t.enterpriseId, t.chave),
    check("cte_documents_chave_chk", sql`${t.chave} ~ '^[0-9]{44}$'`),
    check("cte_documents_emit_cnpj_chk", sql`${t.emitCnpj} ~ '^[0-9]{14}$'`),
  ],
);

/** NF-e citada no CT-e. */
export const cteDocumentNfes = pgTable(
  "cte_document_nfes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cteDocumentId: uuid("cte_document_id")
      .notNull()
      .references(() => cteDocuments.id, { onDelete: "cascade" }),
    chave: varchar("chave", { length: 44 }).notNull(),
  },
  (t) => [
    uniqueIndex("cte_document_nfes_document_chave_unique").on(t.cteDocumentId, t.chave),
    index("cte_document_nfes_chave_idx").on(t.chave),
    check("cte_document_nfes_chave_chk", sql`${t.chave} ~ '^[0-9]{44}$'`),
  ],
);
