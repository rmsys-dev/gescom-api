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
import {
  statusEnum,
  adressTypeEnum,
  sequenceTypeEnum,
  regimeTributarioEnum,
} from "../enums.js";
import { ceps } from "../entities/addresses.js";
import { tz } from "../functions.js";

//Tabela de grupos de empresas (lojas de um mesmo cliente)
export const enterpriseGroups = pgTable(
  "enterprise_groups",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: varchar("name", { length: 255 }).notNull(), // Nome do grupo
    status: statusEnum("status").default("ATIVO").notNull(), // Status
    createdAt: tz("created_at").defaultNow().notNull(), // Data de criação
    updatedAt: tz("updated_at"), // Data de atualização
    deletedAt: tz("deleted_at"), // Data de exclusão
  },
  (t) => [
    uniqueIndex("enterprise_groups_name_active_unique")
      .on(t.name)
      .where(sql`${t.deletedAt} is null`),
  ],
);

//Tabela de empresas
export const enterprises = pgTable(
  "enterprises",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: statusEnum("status").default("ATIVO").notNull(), // Status
    registration: varchar("registration", { length: 14 }).notNull(), // CPF/CNPJ
    legalName: varchar("legal_name", { length: 255 }).notNull(), // Razão Social
    tradeName: varchar("trade_name", { length: 255 }).notNull(), // Nome Fantasia
    phone: varchar("phone", { length: 20 }), // Telefone
    email: varchar("email", { length: 255 }), // Email
    whatsapp: varchar("whatsapp", { length: 20 }), // WhatsApp
    stateRegistration: varchar("state_registration", { length: 14 }), // Inscrição Estadual
    municipalRegistration: varchar("municipal_registration", { length: 15 }), // Inscrição Municipal
    suframaRegistration: varchar("suframa_registration", { length: 9 }), // Inscrição SUFRAMA
    crt: regimeTributarioEnum("crt"), // CRT: 1 Simples Nacional, 2 excesso sublimite, 3 Regime Normal, 4 MEI
    logoUrl: varchar("logo_url", { length: 500 }), // URL do logo da empresa (impressões e DANFE)
    pdfFolder: varchar("pdf_folder", { length: 500 }), // pasta onde o app grava os PDFs das notas (ANO/MES)
    groupId: uuid("group_id").references(() => enterpriseGroups.id, {
      onDelete: "set null",
    }), // Grupo de empresas (opcional)
    registeredOn: date("registered_on", { mode: "date" }) // Data de registro
      .default(sql`CURRENT_DATE`)
      .notNull(),
    createdAt: tz("created_at").defaultNow().notNull(), // Data de criação
    updatedAt: tz("updated_at"), // Data de atualização   
    deletedAt: tz("deleted_at"), // Data de exclusão
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
    index("enterprises_group_idx")
      .on(t.groupId)
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
