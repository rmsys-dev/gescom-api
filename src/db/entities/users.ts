import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  decimal,
  index,
  integer,
  pgTable,
  uniqueIndex,
  varchar,
  uuid,
} from "drizzle-orm/pg-core";
import {
  statusEnum,
  adressTypeEnum,
  typeUserContactEnum,
  maritalStatusEnum,
  housingTypeEnum,
  creditTypeEnum,
  genderEnum,
} from "../enums.js";
import { ceps, countries, states, cities } from "./addresses.js";
import { tz } from "../functions.js";

//Tabela de usuários
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userName: varchar("user_name", { length: 255 }).notNull(),
    userRegistration: varchar("user_registration", { length: 14 }).notNull(), // CPF/CNPJ
    userEmail: varchar("user_email", { length: 255 }).notNull(), // Email
    userPhone: varchar("user_phone", { length: 20 }).notNull(), // Telefone
    status: statusEnum("status").default("ATIVO").notNull(),
    onboardingCompleted: boolean("onboarding_completed")
      .default(false)
      .notNull(),
    registeredOn: date("registered_on", { mode: "date" })
      .default(sql`CURRENT_DATE`)
      .notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("users_registration_active_unique")
      .on(t.userRegistration)
      .where(sql`${t.deletedAt} is null`),
    uniqueIndex("users_email_active_unique")
      .on(t.userEmail)
      .where(sql`${t.userEmail} is not null and ${t.deletedAt} is null`),
    uniqueIndex("users_phone_active_unique")
      .on(t.userPhone)
      .where(sql`${t.userPhone} is not null and ${t.deletedAt} is null`),
    index("users_active_name_idx").on(t.deletedAt, t.userName),
  ],
);

//Tabela de informações pessoais de usuários
export const usersPersonalInfo = pgTable("users_personal_info", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "restrict" }),
  gender: genderEnum("gender"),
  birthDate: date("birth_date", { mode: "date" }), // Data de nascimento
  placeOfBirth: varchar("place_of_birth", { length: 255 }), // Local de nascimento
  createdAt: tz("created_at").defaultNow().notNull(),
  updatedAt: tz("updated_at"),
  deletedAt: tz("deleted_at"),
});

//Tabela de endereços de usuários
export const usersAddress = pgTable(
  "users_address",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    cepId: uuid("cep_id")
      .notNull()
      .references(() => ceps.id, { onDelete: "restrict" }),
    countryId: uuid("country_id")
      .notNull()
      .references(() => countries.id, { onDelete: "restrict" }),
    stateId: uuid("state_id")
      .notNull()
      .references(() => states.id, { onDelete: "restrict" }),
    cityId: uuid("city_id")
      .notNull()
      .references(() => cities.id, { onDelete: "restrict" }),
    adressType: adressTypeEnum("adress_type").notNull(), // Tipo de endereço
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("users_address_principal_active_unique")
      .on(t.userId)
      .where(sql`${t.deletedAt} is null and ${t.adressType} = 'PRINCIPAL'`),
    index("users_address_user_active_idx").on(t.userId, t.deletedAt),
  ],
);

//Tabela de contatos de usuários
export const usersContact = pgTable(
  "users_contact",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    phone: varchar("phone", { length: 20 }), // Telefone
    email: varchar("email", { length: 255 }), // Email
    whatsapp: varchar("whatsapp", { length: 20 }), // WhatsApp
    type: typeUserContactEnum("type").notNull(), // Tipo de contato
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("users_contact_principal_active_unique")
      .on(t.userId)
      .where(sql`${t.deletedAt} is null and ${t.type} = 'PRINCIPAL'`),
    index("users_contact_user_active_idx").on(t.userId, t.deletedAt),
  ],
);

//Tabela de relacionamentos de usuários
export const usersRelationships = pgTable(
  "users_relationships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    maritalStatus: maritalStatusEnum("marital_status"), // Estado civil
    spouseName: varchar("spouse_name", { length: 255 }), // Nome do cônjuge
    housingType: housingTypeEnum("housing_type"), // Tipo de moradia
    rentalPeriod: integer("rental_period"), // Período de aluguel
    motherName: varchar("mother_name", { length: 255 }), // Nome da mãe
    fatherName: varchar("father_name", { length: 255 }), // Nome do pai
    profession: varchar("profession", { length: 255 }), // Profissão
    professionDescription: varchar("profession_description", {
      length: 255,
    }), // Local de trabalho
    professionTime: integer("profession_time"), // Tempo de profissão
    income: decimal("income", { precision: 10, scale: 2 }), // Renda mensal
    linkWithSeller: boolean("link_with_seller"), // Relação com o vendedor
    toWarmUp: boolean("to_warm_up"), // Avisos
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    check("users_relationships_income_non_negative", sql`${t.income} >= 0`),
    check(
      "users_relationships_profession_time_non_negative",
      sql`${t.professionTime} >= 0`,
    ),
    check(
      "users_relationships_rental_period_non_negative",
      sql`${t.rentalPeriod} is null or ${t.rentalPeriod} >= 0`,
    ),
  ],
);

//Tabela de informações fiscais de usuários
export const usersTaxInfos = pgTable("users_tax_infos", {
  id: uuid("id").defaultRandom().primaryKey(),
  renegotiation: boolean("renegotiation"), // Renegociação de dívida
  spc_registration: varchar("spc_registration", { length: 255 }), // Registro SPD
  spc_registry_date: date("spc_registry_date", { mode: "date" }), // Data de registro SPD
  stateRegistration: varchar("state_registration", { length: 255 }), // Registro estadual
  municipalRegistration: varchar("municipal_registration", {
    length: 255,
  }), // Registro municipal
  suframa_registration: varchar("suframa_registration", {
    length: 255,
  }), // Registro Suframa
  userLegalName: varchar("user_legal_name", { length: 255 }), // Nome legal
  r3_code: integer("r3_code"), // Código R3
  sefaz_Date: date("sefaz_date", { mode: "date" }), // Data de registro SEFAZ
  governmentEntity: varchar("government_entity", { length: 255 }), // Entidade governamental
  benefitCode: varchar("benefit_code", { length: 255 }), // Código de benefício
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "restrict" }),
  createdAt: tz("created_at").defaultNow().notNull(),
  updatedAt: tz("updated_at"),
  deletedAt: tz("deleted_at"),
});

//Tabela de informações financeiras de usuários
export const usersFinancialInfo = pgTable(
  "users_financial_info",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ICMSReduction: decimal("icms_reduction", {
      precision: 10,
      scale: 2,
    }), // Redução ICMS
    discountLimit: decimal("discount_limit", {
      precision: 10,
      scale: 2,
    }), // Limite de desconto
    discoutArrangement: varchar("discout_arrangement", {
      length: 255,
    }), // Desconto de acerto
    creditType: creditTypeEnum("credit_type"), // Tipo de crédito
    requestAmount: decimal("request_amount", {
      precision: 10,
      scale: 2,
    }), // Valor do pedido
    budgetPrice: decimal("budget_price", {
      precision: 10,
      scale: 2,
    }), // Valor do orçamento
    taxRegime: varchar("tax_regime", { length: 255 }), // Regime tributário
    purchaseOrder: boolean("purchase_order"), // Pedido de compra
    prevRate: decimal("prev_rate", {
      precision: 10,
      scale: 2,
    }), // taxa_prev
    ratTax: decimal("rat_tax", {
      precision: 10,
      scale: 2,
    }), // taxa_rat
    reductionRate: decimal("reduction_rate", {
      precision: 10,
      scale: 2,
    }), // taxa_redução
    senarTax: decimal("senar_tax", {
      precision: 10,
      scale: 2,
    }), // taxa_senar
    low: boolean("low"), // Baixa
    sale_discount: decimal("sale_discount", {
      precision: 10,
      scale: 2,
    }), // Desconto de venda
    doSt: boolean("do_st"), // Gera ST
    sendNF: boolean("send_nf"), // Envia NF
    userId: uuid("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    check(
      "users_financial_info_icms_reduction_range",
      sql`${t.ICMSReduction} >= 0 and ${t.ICMSReduction} <= 100`,
    ),
    check(
      "users_financial_info_discount_limit_range",
      sql`${t.discountLimit} >= 0 and ${t.discountLimit} <= 100`,
    ),
    check(
      "users_financial_info_request_amount_non_negative",
      sql`${t.requestAmount} >= 0`,
    ),
    check(
      "users_financial_info_budget_price_non_negative",
      sql`${t.budgetPrice} >= 0`,
    ),
    check(
      "users_financial_info_prev_rate_range",
      sql`${t.prevRate} >= 0 and ${t.prevRate} <= 100`,
    ),
    check(
      "users_financial_info_rat_tax_range",
      sql`${t.ratTax} >= 0 and ${t.ratTax} <= 100`,
    ),
    check(
      "users_financial_info_reduction_rate_range",
      sql`${t.reductionRate} >= 0 and ${t.reductionRate} <= 100`,
    ),
    check(
      "users_financial_info_senar_tax_range",
      sql`${t.senarTax} >= 0 and ${t.senarTax} <= 100`,
    ),
    check(
      "users_financial_info_sale_discount_range",
      sql`${t.sale_discount} >= 0 and ${t.sale_discount} <= 100`,
    ),
  ],
);
