import {
  type AnyPgColumn,
  bigint,
  boolean,
  check,
  date,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
  uuid,
  varchar,
  decimal,
  index,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  bankChannelEnum,
  bankSlipEventKindEnum,
  bankSlipStatusEnum,
  cnabLayoutEnum,
  financialDirectionEnum,
  financialInstallmentStatusEnum,
  financialKindEnum,
  financialScheduleSourceEnum,
  financialSettlementKindEnum,
  financialSourceEnum,
  financialTitleStatusEnum,
  memberCreditOriginEnum,
  memberCreditStatusEnum,
  remittanceMovementEnum,
  remittanceStatusEnum,
  returnOccurrenceEnum,
} from "../enums.js";
import { tz, valorDuasCasasDecimais } from "../functions.js";
import { enterprises } from "./enterprises.js";
import { enterprisesMembers } from "./members.js";
import { users } from "./users.js";
import { paymentTypesMethodsFlags, sales } from "./sales.js";
import { nfeHeaders } from "./nfe.js";

export const financialTitles = pgTable(
  "financial_titles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id),
    direction: financialDirectionEnum("direction").notNull(),
    source: financialSourceEnum("source").notNull(),
    kind: financialKindEnum("kind").notNull(),
    status: financialTitleStatusEnum("status").notNull().default("ABERTO"),
    number: integer("number").notNull(),
    memberId: uuid("member_id")
      .notNull()
      .references(() => enterprisesMembers.id),
    issueDate: date("issue_date").notNull(),
    description: varchar("description", { length: 500 }),
    originalAmount: decimal("original_amount", valorDuasCasasDecimais).notNull(),
    openAmount: decimal("open_amount", valorDuasCasasDecimais).notNull(),
    nfeHeaderId: uuid("nfe_header_id").references(() => nfeHeaders.id),
    consolidatedIntoId: uuid("consolidated_into_id").references(
      (): AnyPgColumn => financialTitles.id,
    ),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("financial_titles_enterprise_direction_number_unique").on(
      t.enterpriseId,
      t.direction,
      t.number,
    ),
    index("financial_titles_enterprise_direction_status_idx").on(
      t.enterpriseId,
      t.direction,
      t.status,
    ),
    index("financial_titles_nfe_header_idx").on(t.nfeHeaderId),
    check(
      "financial_titles_open_amount_check",
      sql`${t.openAmount} >= 0 AND ${t.openAmount} <= ${t.originalAmount}`,
    ),
  ],
);

export const financialInstallments = pgTable(
  "financial_installments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    titleId: uuid("title_id")
      .notNull()
      .references(() => financialTitles.id),
    number: integer("number").notNull(),
    dueDate: date("due_date").notNull(),
    originalAmount: decimal("original_amount", valorDuasCasasDecimais).notNull(),
    openAmount: decimal("open_amount", valorDuasCasasDecimais).notNull(),
    status: financialInstallmentStatusEnum("status").notNull().default("ABERTA"),
    scheduleSource: financialScheduleSourceEnum("schedule_source").notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("financial_installments_title_number_source_unique").on(
      t.titleId,
      t.number,
      t.scheduleSource,
    ),
    index("financial_installments_title_due_idx").on(t.titleId, t.dueDate),
    check(
      "financial_installments_open_amount_check",
      sql`${t.openAmount} >= 0 AND ${t.openAmount} <= ${t.originalAmount}`,
    ),
  ],
);

/** `live` marca a origem do título vigente. Consolidado ou cancelado fica live = false. */
export const financialTitleOrigins = pgTable(
  "financial_title_origins",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    titleId: uuid("title_id")
      .notNull()
      .references(() => financialTitles.id),
    salesId: uuid("sales_id").references(() => sales.id),
    nfeHeaderId: uuid("nfe_header_id").references(() => nfeHeaders.id),
    contributedAmount: decimal("contributed_amount", valorDuasCasasDecimais).notNull(),
    returnedAmount: decimal("returned_amount", valorDuasCasasDecimais)
      .notNull()
      .default("0"),
    live: boolean("live").notNull().default(true),
    createdAt: tz("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("financial_title_origins_title_sale_unique")
      .on(t.titleId, t.salesId)
      .where(sql`${t.salesId} is not null`),
    uniqueIndex("financial_title_origins_live_sale_unique")
      .on(t.salesId)
      .where(sql`${t.salesId} is not null and ${t.live} = true`),
    index("financial_title_origins_title_idx").on(t.titleId),
    check(
      "financial_title_origins_source_check",
      sql`${t.salesId} is not null OR ${t.nfeHeaderId} is not null`,
    ),
  ],
);

export const memberCredits = pgTable(
  "member_credits",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id),
    memberId: uuid("member_id")
      .notNull()
      .references(() => enterprisesMembers.id),
    origin: memberCreditOriginEnum("origin").notNull(),
    status: memberCreditStatusEnum("status").notNull().default("ABERTO"),
    originalAmount: decimal("original_amount", valorDuasCasasDecimais).notNull(),
    openAmount: decimal("open_amount", valorDuasCasasDecimais).notNull(),
    salesId: uuid("sales_id").references(() => sales.id),
    returnOrder: integer("return_order"),
    description: varchar("description", { length: 500 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("member_credits_enterprise_member_status_idx").on(
      t.enterpriseId,
      t.memberId,
      t.status,
    ),
    check(
      "member_credits_open_amount_check",
      sql`${t.openAmount} >= 0 AND ${t.openAmount} <= ${t.originalAmount}`,
    ),
  ],
);

export const financialSettlements = pgTable(
  "financial_settlements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id),
    titleId: uuid("title_id")
      .notNull()
      .references(() => financialTitles.id),
    installmentId: uuid("installment_id")
      .notNull()
      .references(() => financialInstallments.id),
    kind: financialSettlementKindEnum("kind").notNull(),
    amount: decimal("amount", valorDuasCasasDecimais).notNull(),
    discount: decimal("discount", valorDuasCasasDecimais).notNull().default("0.00"),
    increase: decimal("increase", valorDuasCasasDecimais).notNull().default("0.00"),
    settledAt: date("settled_at").notNull(),
    paymentTypesMethodsFlagsId: uuid("payment_types_methods_flags_id").references(
      () => paymentTypesMethodsFlags.id,
    ),
    memberCreditId: uuid("member_credit_id").references(() => memberCredits.id),
    salesId: uuid("sales_id").references(() => sales.id),
    returnOrder: integer("return_order"),
    reversesSettlementId: uuid("reverses_settlement_id").references(
      (): AnyPgColumn => financialSettlements.id,
    ),
    note: varchar("note", { length: 500 }),
    userId: uuid("user_id").references(() => users.id),
    createdAt: tz("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("financial_settlements_title_idx").on(t.titleId),
    index("financial_settlements_installment_idx").on(t.installmentId),
    check("financial_settlements_amount_check", sql`${t.amount} >= 0`),
    check("financial_settlements_discount_check", sql`${t.discount} >= 0`),
    check("financial_settlements_increase_check", sql`${t.increase} >= 0`),
  ],
);

export const bankCollectionAgreements = pgTable(
  "bank_collection_agreements",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id),
    bankCode: varchar("bank_code", { length: 3 }).notNull(),
    branch: varchar("branch", { length: 10 }).notNull(),
    branchDigit: varchar("branch_digit", { length: 2 }),
    account: varchar("account", { length: 20 }).notNull(),
    accountDigit: varchar("account_digit", { length: 2 }),
    wallet: varchar("wallet", { length: 10 }).notNull(),
    agreementCode: varchar("agreement_code", { length: 20 }).notNull(),
    walletVariation: varchar("wallet_variation", { length: 10 }),
    beneficiaryDocument: varchar("beneficiary_document", { length: 14 }).notNull(),
    beneficiaryName: varchar("beneficiary_name", { length: 120 }).notNull(),
    channel: bankChannelEnum("channel").notNull(),
    cnabLayout: cnabLayoutEnum("cnab_layout"),
    apiProvider: varchar("api_provider", { length: 30 }),
    credentialRef: varchar("credential_ref", { length: 120 }),
    nextNossoNumero: bigint("next_nosso_numero", { mode: "number" })
      .notNull()
      .default(1),
    remittanceSequence: integer("remittance_sequence").notNull().default(0),
    active: boolean("active").notNull().default(true),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    index("bank_collection_agreements_enterprise_idx").on(t.enterpriseId),
    check(
      "bank_collection_agreements_layout_check",
      sql`(${t.channel} = 'CNAB' AND ${t.cnabLayout} IS NOT NULL) OR (${t.channel} = 'API' AND ${t.cnabLayout} IS NULL)`,
    ),
  ],
);

export const bankSlips = pgTable(
  "bank_slips",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id),
    installmentId: uuid("installment_id")
      .notNull()
      .references(() => financialInstallments.id),
    agreementId: uuid("agreement_id")
      .notNull()
      .references(() => bankCollectionAgreements.id),
    channel: bankChannelEnum("channel").notNull(),
    nossoNumero: varchar("nosso_numero", { length: 20 }).notNull(),
    documentNumber: varchar("document_number", { length: 25 }),
    amount: decimal("amount", valorDuasCasasDecimais).notNull(),
    dueDate: date("due_date").notNull(),
    status: bankSlipStatusEnum("status").notNull().default("AGUARDANDO_REGISTRO"),
    barcode: varchar("barcode", { length: 44 }),
    digitableLine: varchar("digitable_line", { length: 54 }),
    externalId: varchar("external_id", { length: 80 }),
    registeredAt: tz("registered_at"),
    rejectReason: varchar("reject_reason", { length: 300 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("bank_slips_installment_open_unique")
      .on(t.installmentId)
      .where(sql`${t.status} <> 'CANCELADO'`),
    uniqueIndex("bank_slips_agreement_nosso_numero_unique").on(
      t.agreementId,
      t.nossoNumero,
    ),
    index("bank_slips_enterprise_status_idx").on(t.enterpriseId, t.status),
  ],
);

export const bankSlipEvents = pgTable(
  "bank_slip_events",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    slipId: uuid("slip_id")
      .notNull()
      .references(() => bankSlips.id),
    kind: bankSlipEventKindEnum("kind").notNull(),
    occurredAt: tz("occurred_at").defaultNow().notNull(),
    summary: jsonb("summary"),
  },
  (t) => [index("bank_slip_events_slip_idx").on(t.slipId)],
);

export const bankRemittances = pgTable(
  "bank_remittances",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterpriseId: uuid("enterprise_id")
      .notNull()
      .references(() => enterprises.id),
    agreementId: uuid("agreement_id")
      .notNull()
      .references(() => bankCollectionAgreements.id),
    layout: cnabLayoutEnum("layout").notNull(),
    sequence: integer("sequence").notNull(),
    fileName: varchar("file_name", { length: 120 }).notNull(),
    status: remittanceStatusEnum("status").notNull().default("GERADA"),
    content: text("content").notNull(),
    generatedAt: tz("generated_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex("bank_remittances_agreement_sequence_unique").on(
      t.agreementId,
      t.sequence,
    ),
  ],
);

export const bankRemittanceItems = pgTable(
  "bank_remittance_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    remittanceId: uuid("remittance_id")
      .notNull()
      .references(() => bankRemittances.id),
    slipId: uuid("slip_id")
      .notNull()
      .references(() => bankSlips.id),
    movement: remittanceMovementEnum("movement").notNull(),
  },
  (t) => [index("bank_remittance_items_remittance_idx").on(t.remittanceId)],
);

export const bankReturns = pgTable("bank_returns", {
  id: uuid("id").defaultRandom().primaryKey(),
  enterpriseId: uuid("enterprise_id")
    .notNull()
    .references(() => enterprises.id),
  agreementId: uuid("agreement_id")
    .notNull()
    .references(() => bankCollectionAgreements.id),
  fileName: varchar("file_name", { length: 120 }).notNull(),
  layout: cnabLayoutEnum("layout").notNull(),
  content: text("content").notNull(),
  importedAt: tz("imported_at").defaultNow().notNull(),
});

export const bankReturnItems = pgTable(
  "bank_return_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    returnId: uuid("return_id")
      .notNull()
      .references(() => bankReturns.id),
    slipId: uuid("slip_id").references(() => bankSlips.id),
    occurrenceCode: varchar("occurrence_code", { length: 10 }).notNull(),
    occurrence: returnOccurrenceEnum("occurrence").notNull(),
    paidAmount: decimal("paid_amount", valorDuasCasasDecimais),
    paidAt: date("paid_at"),
    creditDate: date("credit_date"),
    nossoNumero: varchar("nosso_numero", { length: 20 }).notNull(),
  },
  (t) => [index("bank_return_items_return_idx").on(t.returnId)],
);
