import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  index,
  pgTable,
  uniqueIndex,
  varchar,
  uuid,
  integer,
} from "drizzle-orm/pg-core";
import { statusEnum, adressTypeEnum, sequenceTypeEnum } from "../enums.js";
import { ceps } from "../entities/addresses.js";
import { tz } from "../functions.js";

//Tabela de empresas
export const enterprises = pgTable(
  "enterprises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: statusEnum("status").default("ATIVO").notNull(),
    registration: varchar("registration", { length: 14 }).notNull(), // CPF/CNPJ
    legalName: varchar("legal_name", { length: 255 }).notNull(), // Razão Social
    tradeName: varchar("trade_name", { length: 255 }).notNull(), // Nome Fantasia
    phone: varchar("phone", { length: 20 }), // Telefone
    email: varchar("email", { length: 255 }), // Email
    whatsapp: varchar("whatsapp", { length: 20 }), // WhatsApp
    registeredOn: date("registered_on", { mode: "date" })
      .default(sql`CURRENT_DATE`)
      .notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("enterprises_registration_active_unique")
      .on(t.registration)
      .where(sql`${t.deletedAt} is null`),
    uniqueIndex("enterprises_legal_name_active_unique")
      .on(t.legalName)
      .where(sql`${t.deletedAt} is null`),
    uniqueIndex("enterprises_trade_name_active_unique")
      .on(t.tradeName)
      .where(sql`${t.deletedAt} is null`),
  ],
);

//Tabela de endereços de empresas
export const enterprisesAddress = pgTable(
  "enterprises_address",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    number: varchar("number", { length: 255 }).notNull(), //Número
    complement: varchar("complement", { length: 255 }), //Complemento
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "restrict" }),
    cepId: uuid("cep_id")
      .notNull()
      .references(() => ceps.id, { onDelete: "restrict" }),
    adressType: adressTypeEnum("adress_type").notNull(), // Tipo de endereço
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("enterprises_address_principal_active_unique")
      .on(t.enterpriseId)
      .where(sql`${t.deletedAt} is null and ${t.adressType} = 'PRINCIPAL'`),
    index("enterprises_address_enterprise_active_idx").on(t.enterpriseId),
  ],
);

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

/** Parâmetros / feature flags por empresa (EAV). */
export const enterpriseParameters = pgTable(
  "enterprise_parameters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "restrict" }),
    parameter: varchar("parameter", { length: 255 }).notNull(),
    enabled: boolean("enabled").notNull().default(true),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("enterprise_parameters_enterprise_parameter_active_unique")
      .on(t.enterpriseId, t.parameter)
      .where(sql`${t.deletedAt} is null`),
    index("enterprise_parameters_enterprise_active_idx").on(t.enterpriseId),
  ],
);
