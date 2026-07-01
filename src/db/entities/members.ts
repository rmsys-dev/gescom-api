import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  uniqueIndex,
  varchar,
  uuid,
  decimal,
} from "drizzle-orm/pg-core";
import {
  statusEnum,
  statusPermissionEnum,
  memberClassEnum,
  invitePurposeEnum,
  inviteChannelEnum,
  creditTypeEnum,
  adressTypeEnum,
  typeUserContactEnum,
  maritalStatusEnum,
  housingTypeEnum,
  genderEnum,
} from "../enums.js";
import { users } from "./users.js";
import { enterprises } from "./enterprises.js";
import { departments } from "./departments.js";
import { typeSupplierCustomers } from "./typeSupplierCustomers.js";
import { typeNetworks } from "./typeNetworks.js";
import { ceps } from "./addresses.js";
import { tz } from "../functions.js";
import { percentageDecimal } from "../functions.js";


//Tabela de membros de empresas
export const enterprisesMembers = pgTable(
  "enterprises_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    
    code: integer("code"),  // Código do membro
    status: statusEnum("status").default("ATIVO").notNull(), // Status
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }), // Usuário
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "restrict" }), // Empresa
    class: memberClassEnum("class").notNull(), // Classe
    observations: varchar("observations", { length: 500 }), // Observações
    includedBy: uuid("included_by")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }), // Incluído por
    registeredOn: date("registered_on", { mode: "date" })
      .default(sql`CURRENT_DATE`)
      .notNull(),
    saleLimit: decimal("sale_limit", percentageDecimal).notNull().default("0.00"),  // Limite de vendas
    exceedDiscountSale: boolean("exceed_discount_sale").notNull().default(false),  // Exceder desconto de venda
    receiptLimitDiscount: decimal("receipt_limit_discount", percentageDecimal).notNull().default("0.00"),  // Limite de desconto de recebimento
    comissionOnSight: decimal("comission_on_sight", percentageDecimal).notNull().default("0.00"),  // Comissão a vista
    comissionToTerms: decimal("comission_to_terms", percentageDecimal).notNull().default("0.00"),  // Comissão a prazo
    comissionPartial: decimal("comission_partial", percentageDecimal).notNull().default("0.00"),  // Comissão parcial
    typeSupplierCustomerId: uuid("type_supplier_customer_id").references(  
      () => typeSupplierCustomers.id,
      { onDelete: "restrict" },
    ),
    typeNetworkId: uuid("type_network_id").references(() => typeNetworks.id, { 
      onDelete: "restrict",
    }),
    approvedAt: date("approved_at", { mode: "date" }), // Data de aprovação / ativação
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("enterprises_members_user_enterprise_active_unique")
      .on(t.userId, t.enterpriseId)
      .where(sql`${t.deletedAt} is null`),
    index("enterprises_members_enterprise_active_idx").on(
      t.enterpriseId,
      t.deletedAt,
    ),
  ],
);

//Convites de primeiro acesso / aceite de vínculo (código de 6 dígitos, TTL limitado)
export const userInvitations = pgTable(
  "user_invitations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: statusEnum("status").default("ATIVO").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    purpose: invitePurposeEnum("purpose").notNull(),
    memberId: uuid("member_id").references(() => enterprisesMembers.id, {
      onDelete: "restrict",
    }),
    codeHash: varchar("code_hash", { length: 255 }).notNull(),
    channel: inviteChannelEnum("channel").notNull(),
    sentTo: varchar("sent_to", { length: 255 }).notNull(),
    attempts: integer("attempts").default(0).notNull(),
    maxAttempts: integer("max_attempts").default(5).notNull(),
    expiresAt: date("expires_at", { mode: "date" }).notNull(),
    consumedAt: date("consumed_at", { mode: "date" }),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: varchar("user_agent", { length: 500 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("user_invitations_first_access_user_pending_unique")
      .on(t.userId)
      .where(
        sql`${t.purpose} = 'FIRST_ACCESS'::invite_purpose and ${t.consumedAt} is null and ${t.deletedAt} is null`,
      ),
    uniqueIndex("user_invitations_membership_member_pending_unique")
      .on(t.memberId)
      .where(
        sql`${t.purpose} = 'MEMBERSHIP_ACCEPT'::invite_purpose and ${t.memberId} is not null and ${t.consumedAt} is null and ${t.deletedAt} is null`,
      ),
    check("user_invitations_attempts_non_negative", sql`${t.attempts} >= 0`),
    check(
      "user_invitations_attempts_le_max",
      sql`${t.attempts} <= ${t.maxAttempts}`,
    ),
    check(
      "user_invitations_membership_member_required",
      sql`${t.purpose} <> 'MEMBERSHIP_ACCEPT'::invite_purpose or ${t.memberId} is not null`,
    ),
    index("user_invitations_user_member_purpose_idx").on(
      t.userId,
      t.memberId,
      t.purpose,
    ),
  ],
);

//Tabela de departamentos de membros de empresas
export const membersDepartments = pgTable(
  "members_departments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: statusEnum("status").default("ATIVO").notNull(), // Status
    memberId: uuid("member_id")
      .notNull()
      .references(() => enterprisesMembers.id, { onDelete: "restrict" }), // Vínculo membro-empresa
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "restrict" }), // Departamento
    mainDepartment: boolean("main_department").notNull(), // Departamento principal
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("members_departments_member_department_active_unique")
      .on(t.memberId, t.departmentId)
      .where(sql`${t.deletedAt} is null`),
    uniqueIndex("members_departments_main_unique")
      .on(t.memberId)
      .where(sql`${t.mainDepartment} = true and ${t.deletedAt} is null`),
    index("members_departments_member_department_idx").on(
      t.memberId,
      t.departmentId,
    ),
  ],
);

//Permissões padrão (snapshot do arquivo estático no momento do vínculo)
export const memberPermissionsDefault = pgTable(
  "member_permissions_default",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    permission: varchar("permission", { length: 255 }).notNull(), // Permissão
    status: statusPermissionEnum("status").default("ALLOW").notNull(), // Status
    memberDepartmentId: uuid("member_department_id")
      .notNull()
      .references(() => membersDepartments.id, { onDelete: "cascade" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("member_permissions_default_member_dept_perm_active_unique")
      .on(t.memberDepartmentId, t.permission)
      .where(sql`${t.deletedAt} is null`),
  ],
);

//Tabela de informações pessoais de membros
export const membersPersonalInfo = pgTable(
  "members_personal_info",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => enterprisesMembers.id, { onDelete: "restrict" }),
    gender: genderEnum("gender"), // Gênero
    birthDate: date("birth_date", { mode: "date" }), // Data de nascimento
    placeOfBirth: varchar("place_of_birth", { length: 255 }), // Cidade de nascimento
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("members_personal_info_member_active_unique")
      .on(t.memberId)
      .where(sql`${t.deletedAt} is null`),
  ],
);

//Tabela de endereços de membros
export const membersAddress = pgTable(
  "members_address",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    number: varchar("number", { length: 255 }).notNull(), //Número
    complement: varchar("complement", { length: 255 }), //Complemento
    memberId: uuid("member_id")
      .notNull()
      .references(() => enterprisesMembers.id, { onDelete: "restrict" }),
    cepId: uuid("cep_id")
      .notNull()
      .references(() => ceps.id, { onDelete: "restrict" }),    
    adressType: adressTypeEnum("adress_type").notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("members_address_principal_active_unique")
      .on(t.memberId)
      .where(sql`${t.deletedAt} is null and ${t.adressType} = 'PRINCIPAL'`),
    index("members_address_member_active_idx").on(t.memberId, t.deletedAt),
  ],
);

//Tabela de contatos de membros
export const membersContact = pgTable(
  "members_contact",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => enterprisesMembers.id, { onDelete: "restrict" }),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),
    whatsapp: varchar("whatsapp", { length: 20 }),
    type: typeUserContactEnum("type").notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("members_contact_principal_active_unique")
      .on(t.memberId)
      .where(sql`${t.deletedAt} is null and ${t.type} = 'PRINCIPAL'`),
    index("members_contact_member_active_idx").on(t.memberId, t.deletedAt),
  ],
);

//Tabela de relacionamentos de membros
export const membersRelationships = pgTable(
  "members_relationships",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    maritalStatus: maritalStatusEnum("marital_status"),
    spouseName: varchar("spouse_name", { length: 255 }),
    housingType: housingTypeEnum("housing_type"),
    rentalPeriod: integer("rental_period"),
    motherName: varchar("mother_name", { length: 255 }),
    fatherName: varchar("father_name", { length: 255 }),
    profession: varchar("profession", { length: 255 }),
    professionDescription: varchar("profession_description", {
      length: 255,
    }),
    professionTime: integer("profession_time"),
    income: decimal("income", { precision: 10, scale: 2 }),
    linkWithSeller: boolean("link_with_seller"),
    toWarmUp: boolean("to_warm_up"),
    memberId: uuid("member_id")
      .notNull()
      .references(() => enterprisesMembers.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("members_relationships_member_active_unique")
      .on(t.memberId)
      .where(sql`${t.deletedAt} is null`),
    check("members_relationships_income_non_negative", sql`${t.income} >= 0`),
    check(
      "members_relationships_profession_time_non_negative",
      sql`${t.professionTime} >= 0`,
    ),
    check(
      "members_relationships_rental_period_non_negative",
      sql`${t.rentalPeriod} is null or ${t.rentalPeriod} >= 0`,
    ),
  ],
);

//Tabela de informações fiscais de membros
export const membersTaxInfos = pgTable(
  "members_tax_infos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    renegotiation: boolean("renegotiation"),
    spc_registration: varchar("spc_registration", { length: 255 }),
    spc_registry_date: date("spc_registry_date", { mode: "date" }),
    stateRegistration: varchar("state_registration", { length: 255 }),
    municipalRegistration: varchar("municipal_registration", {
      length: 255,
    }),
    suframa_registration: varchar("suframa_registration", {
      length: 255,
    }),
    userLegalName: varchar("user_legal_name", { length: 255 }),
    r3_code: integer("r3_code"),
    sefaz_Date: date("sefaz_date", { mode: "date" }),
    governmentEntity: varchar("government_entity", { length: 255 }),
    benefitCode: varchar("benefit_code", { length: 255 }),
    memberId: uuid("member_id")
      .notNull()
      .references(() => enterprisesMembers.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("members_tax_infos_member_active_unique")
      .on(t.memberId)
      .where(sql`${t.deletedAt} is null`),
  ],
);

//Tabela de informações financeiras de membros
export const membersFinancialInfo = pgTable(
  "members_financial_info",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    ICMSReduction: decimal("icms_reduction", {
      precision: 10,
      scale: 2,
    }), // Redução de ICMS
    discountLimit: decimal("discount_limit", {  
      precision: 10,
      scale: 2,
    }), // Limite de desconto
    discoutArrangement: varchar("discout_arrangement", {
      length: 255,
    }), // Arrangement de desconto
    creditType: creditTypeEnum("credit_type"), 
    requestAmount: decimal("request_amount", {
      precision: 10,
      scale: 2,
    }), // Valor solicitado
    budgetPrice: decimal("budget_price", {
      precision: 10,
      scale: 2,
    }), // Preço orçado
    taxRegime: varchar("tax_regime", { length: 255 }), // Regime tributário
    purchaseOrder: boolean("purchase_order"), // Pedido de compra
    prevRate: decimal("prev_rate", {
      precision: 10,
      scale: 2,
    }), // Taxa anterior
    ratTax: decimal("rat_tax", {
      precision: 10,
      scale: 2,
    }), // Taxa RAT
    reductionRate: decimal("reduction_rate", {
      precision: 10,
      scale: 2,
    }), // Taxa de redução
    senarTax: decimal("senar_tax", {
      precision: 10,
      scale: 2,
    }), // Taxa SENAR
    sale_discount: decimal("sale_discount", {
      precision: 10,
      scale: 2,
    }), // Desconto de venda
    sendNF: boolean("send_nf"), // Enviar NF
    memberId: uuid("member_id") // Vínculo membro-empresa
      .notNull()
      .references(() => enterprisesMembers.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("members_financial_info_member_active_unique")
      .on(t.memberId)
      .where(sql`${t.deletedAt} is null`),
    check(
      "members_financial_info_icms_reduction_range",
      sql`${t.ICMSReduction} >= 0 and ${t.ICMSReduction} <= 100`,
    ),
    check(
      "members_financial_info_discount_limit_range",
      sql`${t.discountLimit} >= 0 and ${t.discountLimit} <= 100`,
    ),
    check(
      "members_financial_info_request_amount_non_negative",
      sql`${t.requestAmount} >= 0`,
    ),
    check(
      "members_financial_info_budget_price_non_negative",
      sql`${t.budgetPrice} >= 0`,
    ),
    check(
      "members_financial_info_prev_rate_range",
      sql`${t.prevRate} >= 0 and ${t.prevRate} <= 100`,
    ),
    check(
      "members_financial_info_rat_tax_range",
      sql`${t.ratTax} >= 0 and ${t.ratTax} <= 100`,
    ),
    check(
      "members_financial_info_reduction_rate_range",
      sql`${t.reductionRate} >= 0 and ${t.reductionRate} <= 100`,
    ),
    check(
      "members_financial_info_senar_tax_range",
      sql`${t.senarTax} >= 0 and ${t.senarTax} <= 100`,
    ),
    check(
      "members_financial_info_sale_discount_range",
      sql`${t.sale_discount} >= 0 and ${t.sale_discount} <= 100`,
    ),
  ],
);

//Permissões extras concedidas por demanda
export const memberExtraPermissions = pgTable(
  "member_extra_permissions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    permission: varchar("permission", { length: 255 }).notNull(), // Permissão
    status: statusPermissionEnum("status").default("ALLOW").notNull(), // Status
    memberDepartmentId: uuid("member_department_id")
      .notNull()
      .references(() => membersDepartments.id, { onDelete: "cascade" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
    deletedAt: tz("deleted_at"),
  },
  (t) => [
    uniqueIndex("member_extra_permissions_member_dept_perm_active_unique")
      .on(t.memberDepartmentId, t.permission)
      .where(sql`${t.deletedAt} is null`),
  ],
);

