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
  decimal,
  check,
} from "drizzle-orm/pg-core";
import {
  adressTypeEnum,
  creditTypeEnum,
  genderEnum,
  housingTypeEnum,
  maritalStatusEnum,
  statusEnum,
  typeUserContactEnum,
} from "../enums.js";
import { tz, percentageDecimal, valorDuasCasasDecimais } from "../functions.js";
import { ceps } from "./addresses.js";

//Tabela de usuários
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userName: varchar("user_name", { length: 255 }).notNull(),
    userRegistration: varchar("user_registration", { length: 14 }), // CPF/CNPJ
    userEmail: varchar("user_email", { length: 255 }), // Email
    userPhone: varchar("user_phone", { length: 20 }), // Telefone
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
    index("users_active_name_idx").on(t.deletedAt, t.userName),
    uniqueIndex("users_active_identity_unique")
      .on(t.userName, t.userRegistration, t.userEmail)
      .where(sql`${t.deletedAt} is null`), // Combinação nome + CPF/CNPJ + email única
  ],
);

//Tabela de informações pessoais de membros
export const usersPersonalInfo = pgTable(
  "users_personal_info",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    gender: genderEnum("gender"), // Gênero
    birthDate: date("birth_date", { mode: "date" }), // Data de nascimento
    placeOfBirth: varchar("place_of_birth", { length: 255 }), // Cidade de nascimento
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("users_personal_info_user_active_unique")
      .on(t.userId)
      .where(sql`${t.deletedAt} is null`),
  ],
);

//Tabela de endereços de membros
export const usersAddress = pgTable(
  "users_address",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    number: varchar("number", { length: 255 }).notNull(), //Número
    complement: varchar("complement", { length: 255 }), //Complemento
    stateRegistration: varchar("state_registration", { length: 255 }), //Inscrição estadual
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    cepId: uuid("cep_id")
      .notNull()
      .references(() => ceps.id, { onDelete: "restrict" }),
    adressType: adressTypeEnum("adress_type").notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("users_address_state_registration_adress_type_active_unique")
      .on(t.userId, t.stateRegistration, t.adressType)
      .where(sql`${t.deletedAt} is null and ${t.stateRegistration} is not null`),
    index("users_address_user_active_idx").on(t.userId, t.deletedAt),
  ],
);

//Tabela de contatos de membros
export const usersContact = pgTable(
  "users_contact",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),
    whatsapp: varchar("whatsapp", { length: 20 }),
    type: typeUserContactEnum("type").notNull(),
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

//Tabela de relacionamentos de membros
export const usersRelationships = pgTable(
  "users_relationships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    maritalStatus: maritalStatusEnum("marital_status"),
    spouseName: varchar("spouse_name", { length: 255 }),
    housingType: housingTypeEnum("housing_type"), 
    rentalPeriod: varchar("rental_period", { length: 255 }), 
    motherName: varchar("mother_name", { length: 255 }),
    fatherName: varchar("father_name", { length: 255 }),
    workplace: varchar("workplace", { length: 255 }), 
    workAddress: varchar("work_address", { length: 255 }), 
    departmentLabor: varchar("department_labor", { length: 255 }), 
    professionTime: varchar("profession_time", { length: 255 }), 
    income: decimal("income", valorDuasCasasDecimais), 
    rentalPrice: decimal("rental_price", valorDuasCasasDecimais), // Preço de aluguel
    toWarmUp: boolean("to_warm_up"), 
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("users_relationships_user_active_unique")
      .on(t.userId)
      .where(sql`${t.deletedAt} is null`),
    check("users_relationships_income_non_negative", sql`${t.income} >= 0`),
  ],
);

//Tabela de informações fiscais de membros
export const usersTaxInfos = pgTable(
  "users_tax_infos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    renegotiation: boolean("renegotiation"),
    spc_registration: boolean("spc_registration").default(false), 
    spc_registry_date: date("spc_registry_date", { mode: "date" }), 
    municipalRegistration: varchar("municipal_registration", {
      length: 255,
    }),
    suframa_registration: varchar("suframa_registration", {
      length: 255,
    }),
    userLegalName: varchar("user_legal_name", { length: 255 }),  // nome fantasia
    r3_code: integer("r3_code"),
    sefaz_Date: date("sefaz_date", { mode: "date" }),
    governmentEntity: varchar("government_entity", { length: 1 }),
    governmentReductionRate: decimal("government_reduction_rate", percentageDecimal), 
    identityDocument: varchar("identity_document", { length: 255 }),  // Documento de identidade
    partnerName1: varchar("partner_name1", { length: 255 }), // Nome do socio1
    partnerName2: varchar("partner_name2", { length: 255 }), // Nome do socio2    
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("users_tax_infos_user_active_unique")
      .on(t.userId)
      .where(sql`${t.deletedAt} is null`),
  ],
);

//Tabela de informações financeiras de membros
export const usersFinancialInfo = pgTable(
  "users_financial_info",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ICMSReduction: decimal("icms_reduction", percentageDecimal), // Redução de ICMS
    discountLimit: decimal("discount_limit", percentageDecimal), // Limite de desconto
    discoutArrangement: decimal("discout_arrangement", percentageDecimal), // desconto acerto 
    creditType: creditTypeEnum("credit_type"), // tipo de crédito
    requestAmount: decimal("request_amount", valorDuasCasasDecimais), // Valor solicitado
    creditLimit: decimal("credit_limit", valorDuasCasasDecimais), // Limite de crédito
    taxRegime: varchar("tax_regime", { length: 255 }), // Regime tributário
    purchaseOrder: boolean("purchase_order"), // Pedido de compra
    prevRate: decimal("prev_rate", percentageDecimal), // taxa prevista
    ratTax: decimal("rat_tax", percentageDecimal), // Taxa RAT    
    billingCommission: decimal("billing_commission", percentageDecimal), // Taxa de comissão de faturamento    
    senarTax: decimal("senar_tax", percentageDecimal), // Taxa SENAR
    sale_discount: decimal("sale_discount", percentageDecimal), // Desconto de venda
    sendNF: boolean("send_nf"), // Enviar NF
    quotedPrice: boolean("quoted_price").default(true).notNull(), // Informar Preço no orcamento.
    userId: uuid("user_id") // Vínculo usuário-empresa
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("users_financial_info_user_active_unique")
      .on(t.userId)
      .where(sql`${t.deletedAt} is null`),
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
      sql`${t.creditLimit} >= 0`,
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
      sql`${t.billingCommission} >= 0 and ${t.billingCommission} <= 100`,
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
