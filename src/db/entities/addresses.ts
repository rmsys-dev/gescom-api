import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  decimal,
  integer,
  pgTable,
  uniqueIndex,
  varchar,
  uuid,
} from "drizzle-orm/pg-core";
import { tz, percentageDecimal } from "../functions.js";

//Tabela de países
export const countries = pgTable(
  "countries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    countryCode: varchar("country_code", { length: 4 }).notNull(), //Código do país
    countryName: varchar("country_name", { length: 255 }).notNull(), //Nome do país
    cbsTax: decimal("cbs_tax", percentageDecimal).notNull(), //Alíquota CBS
    isTax: decimal("is_tax", percentageDecimal).notNull(), //Alíquota IS
    ibs_uf_tax: decimal("ibs_uf_tax", percentageDecimal).notNull(), //Alíquota UF IB
    ibs_municipal_tax: decimal("ibs_municipal_tax", percentageDecimal).notNull(), //Alíquota municipal IB
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("countries_country_code_active_unique")
      .on(t.countryCode)
      .where(sql`${t.deletedAt} is null`),
    check(
      "countries_cbs_tax_range",
      sql`${t.cbsTax} >= 0 and ${t.cbsTax} <= 100.00`,
    ),
    check("countries_is_tax_range", sql`${t.isTax} >= 0 and ${t.isTax} <= 100.00`),
    check(
      "countries_ibs_uf_tax_range",
      sql`${t.ibs_uf_tax} >= 0 and ${t.ibs_uf_tax} <= 100.00`,
    ),
    check(
      "countries_ibs_municipal_tax_range",
      sql`${t.ibs_municipal_tax} >= 0 and ${t.ibs_municipal_tax} <= 100.00`,
    ),
  ],
);

//Tabela de estados
export const states = pgTable(
  "states",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    acronym: varchar("acronym", { length: 2 }).notNull(), //Sigla
    description: varchar("description", { length: 255 }).notNull(), //Descrição
    internalAliquot: decimal("internal_aliquot", percentageDecimal).notNull(), //Alíquota interna
    interstateAliquot: decimal("interstate_aliquot", percentageDecimal).notNull(), //Alíquota interestadual
    fcpAliquot: decimal("fcp_aliquot", percentageDecimal).notNull(), //Alíquota FCP
    borders: integer("borders").notNull(), //Divisas
    embedDifal: boolean("embed_difal").notNull(), // embutir de DIFAL
    ibs_uf_tax: decimal("ibs_uf_tax", percentageDecimal).notNull(), //Alíquota UF IB
    ibs_municipal_tax: decimal("ibs_municipal_tax", percentageDecimal).notNull(), //Alíquota municipal IB
    countryId: uuid("country_id") 
      .notNull()
      .references(() => countries.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("states_country_acronym_active_unique")
      .on(t.countryId, t.acronym)
      .where(sql`${t.deletedAt} is null`),
    check(
      "states_internal_aliquot_range",
      sql`${t.internalAliquot} >= 0 and ${t.internalAliquot} <= 100.00`,
    ),
    check(
      "states_interstate_aliquot_range",
      sql`${t.interstateAliquot} >= 0 and ${t.interstateAliquot} <= 100.00`,
    ),
    check(
      "states_fcp_aliquot_range",
      sql`${t.fcpAliquot} >= 0 and ${t.fcpAliquot} <= 100.00`,
    ),
    check(
      "states_ibs_uf_tax_range",
      sql`${t.ibs_uf_tax} >= 0 and ${t.ibs_uf_tax} <= 100.00`,
    ),
    check(
      "states_ibs_municipal_tax_range",
      sql`${t.ibs_municipal_tax} >= 0 and ${t.ibs_municipal_tax} <= 100.00`,
    ),
  ],
);

//Tabela de CEPs
export const ceps = pgTable(
  "ceps",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    cepNumber: varchar("cep_number", { length: 8 }).notNull(), //CEP
    address: varchar("address", { length: 255 }).notNull(), //Endereço
    number: varchar("number", { length: 255 }).notNull(), //Número
    complement: varchar("complement", { length: 255 }), //Complemento
    neighborhood: varchar("neighborhood", { length: 255 }).notNull(), //Bairro
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("ceps_city_cep_active_unique")
      .on(t.cityId, t.cepNumber)
      .where(sql`${t.deletedAt} is null`),
  ],
);

//Tabela de cidades
export const cities = pgTable(
  "cities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ibgeCode: integer("ibge_code").notNull(), //Código IBGE
    citieName: varchar("city_name", { length: 255 }).notNull(), //Nome da cidade
    citieCode: varchar("city_code", { length: 2 }).notNull(),
    citieDigit: integer("city_digit").notNull(),
    ibs_municipal_tax: decimal("ibs_municipal_tax", percentageDecimal).notNull(), //Alíquota municipal IB

    stateId: uuid("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("cities_ibge_code_active_unique")
      .on(t.ibgeCode)
      .where(sql`${t.deletedAt} is null`),
    uniqueIndex("cities_state_name_active_unique")
      .on(t.stateId, t.citieName)
      .where(sql`${t.deletedAt} is null`),
    check(
      "cities_ibs_municipal_tax_range",
      sql`${t.ibs_municipal_tax} >= 0 and ${t.ibs_municipal_tax} <= 100.00`,
    ),
  ],
);
