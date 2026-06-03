import {
  pgTable,
  uniqueIndex,
  index,
  check,
  uuid,
  varchar,
  decimal,
  integer,
  type AnyPgColumn,
  date,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import {
  budgetClosureSituationEnum,
  budgetConversionKindEnum,
  saleReturnKindEnum,
  saleReturnSituationEnum,
  saleReturnStatusEnum,
  saleStatusEnum,
  saleTypeEnum,
  statusEnum,
} from "../enums.js";
import { users } from "./users.js";
import { enterprisesMembers } from "./members.js";
import { enterprises } from "./enterprises.js";
import {
  measurementUnits,
  productTypes,
  productsEnterprises,
} from "./products.js";
import { stockSectors, stockLocations, stockBatches } from "./stock.js";
import { tz } from "../functions.js";
import { percentageDecimal } from "../functions.js";

export const paymentTypes = pgTable(
  "payment_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    description: varchar("description", { length: 255 }).notNull(),
    status: statusEnum("status").notNull().default("ATIVO"),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("stock_movements_type_status_unique")
      .on(t.description)
      .where(sql`${t.status} = 'ATIVO'`),
  ],
);

// VENDAS.
export const sales = pgTable(
  "sales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: integer("order_number").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    userLegalName: varchar("user_legal_name", { length: 255 }).notNull(),
    memberId: uuid("member_id").references(() => enterprisesMembers.id, {
      onDelete: "restrict",
    }),
    type: saleTypeEnum("type").notNull(),
    subTotal: decimal("sub_total", { precision: 14, scale: 2 }).notNull(),
    percentageDiscount: decimal("percentage_discount", percentageDecimal),
    discountValuetems: decimal("discount_value_items", {
      precision: 14,
      scale: 2,
    }),
    valueDiscountFinancial: decimal("value_discount_financial", {
      precision: 14,
      scale: 2,
    }),
    percentageAcresce: decimal("percentage_acresce", percentageDecimal),
    valueAcresceItems: decimal("value_acresce_items", {
      precision: 14,
      scale: 2,
    }),
    valueAcresceFinancial: decimal("value_acresce_financial", {
      precision: 14,
      scale: 2,
    }),
    valuePie: decimal("value_pie", { precision: 14, scale: 2 }),
    valueService: decimal("value_service", { precision: 14, scale: 2 }),
    valueLiquid: decimal("value_liquid", { precision: 14, scale: 2 }),
    status: saleStatusEnum("status").notNull(),
    returnSituation: saleReturnSituationEnum("return_situation")
      .notNull()
      .default("SEM_DEVOLUCAO"),
    budgetClosureSituation: budgetClosureSituationEnum(
      "budget_closure_situation",
    )
      .notNull()
      .default("ABERTO"),
    sourceBudgetSaleId: uuid("source_budget_sale_id").references(
      (): AnyPgColumn => sales.id,
      { onDelete: "restrict" },
    ),
    completedionDate: date("completedion_date", { mode: "date" }), // finalizada
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "restrict" }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("sales_enterprises_id_order_number_unique").on(
      t.enterprisesId,
      t.orderNumber,
    ),
    index("sales_source_budget_sale_id_idx").on(t.sourceBudgetSaleId),
    index("sales_analytics_realized_idx")
      .on(t.enterprisesId, t.completedionDate)
      .where(sql`${t.type} = 'VENDA' AND ${t.status} = 'FINALIZADA'`),
    index("sales_analytics_pipeline_idx")
      .on(t.enterprisesId, t.createdAt)
      .where(sql`${t.status} = 'ABERTA'`),
  ],
);

// VENDAS ITENS.
export const salesItems = pgTable(
  "sales_items",
  {
  id: uuid("id").defaultRandom().primaryKey().unique(),
  quantity: decimal("quantity", { precision: 14, scale: 4 }).notNull(),
  valueUnit: decimal("value_unit", { precision: 14, scale: 4 }).notNull(),
  valueDiscount: decimal("value_discount", {
    precision: 14,
    scale: 4,
  }).notNull(),
  valueAcresce: decimal("value_acresce", { precision: 14, scale: 4 }).notNull(),
  valueTotal: decimal("value_total", { precision: 14, scale: 4 }).notNull(),
  salesId: uuid("sales_id")
    .notNull()
    .references(() => sales.id, { onDelete: "cascade" }),
  productsEnterprisesId: uuid("products_enterprises_id")
    .notNull()
    .references(() => productsEnterprises.id, { onDelete: "restrict" }), // PRODUTO EMPRESA
  unitid: uuid("unit_id")
    .notNull()
    .references(() => measurementUnits.id, { onDelete: "restrict" }), // UNIDADE
  productTypeId: uuid("product_type_id")
    .notNull()
    .references(() => productTypes.id, { onDelete: "restrict" }), // TIPO DE PRODUTO
  stockSectorId: uuid("stock_sector_id").references(() => stockSectors.id, {
    onDelete: "restrict",
  }), // SETOR DE ESTOQUE
  stockLocationId: uuid("stock_location_id").references(
    () => stockLocations.id,
    {
      onDelete: "restrict",
    },
  ),
  stockBatchId: uuid("stock_batch_id").references(() => stockBatches.id, {
    onDelete: "restrict",
  }),
  quantityReturned: decimal("quantity_returned", {
    precision: 14,
    scale: 4,
  })
    .notNull()
    .default("0"),
  quantityConverted: decimal("quantity_converted", {
    precision: 14,
    scale: 4,
  })
    .notNull()
    .default("0"),
  sourceBudgetItemId: uuid("source_budget_item_id").references(
    (): AnyPgColumn => salesItems.id,
    { onDelete: "restrict" },
  ),
  createdAt: tz("created_at").defaultNow().notNull(),
  updatedAt: tz("updated_at"),
  },
  (t) => [
    index("sales_items_products_enterprises_id_idx").on(
      t.productsEnterprisesId,
    ),
  ],
);

// CONVERSOES ORCAMENTO -> VENDA (historico auditavel).
export const salesBudgetConversions = pgTable(
  "sales_budget_conversions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "restrict" }),
    budgetSaleId: uuid("budget_sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "restrict" }),
    generatedSaleId: uuid("generated_sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "restrict" }),
    closureKind: budgetConversionKindEnum("closure_kind").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    userLegalName: varchar("user_legal_name", { length: 255 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("sales_budget_conversions_budget_sale_id_idx").on(t.budgetSaleId),
    index("sales_budget_conversions_generated_sale_id_idx").on(
      t.generatedSaleId,
    ),
  ],
);

export const salesBudgetConversionItems = pgTable(
  "sales_budget_conversion_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversionId: uuid("conversion_id")
      .notNull()
      .references(() => salesBudgetConversions.id, { onDelete: "cascade" }),
    budgetItemId: uuid("budget_item_id")
      .notNull()
      .references(() => salesItems.id, { onDelete: "restrict" }),
    saleItemId: uuid("sale_item_id")
      .notNull()
      .references(() => salesItems.id, { onDelete: "restrict" }),
    quantity: decimal("quantity", { precision: 14, scale: 4 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex(
      "sales_budget_conversion_items_conversion_budget_item_unique",
    ).on(t.conversionId, t.budgetItemId),
    check(
      "sales_budget_conversion_items_quantity_positive",
      sql`${t.quantity} > 0`,
    ),
  ],
);

export const salesReturns = pgTable(
  "sales_returns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    returnNumber: integer("return_number").notNull(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "restrict" }),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "restrict" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: saleReturnStatusEnum("status").notNull().default("ABERTA"),
    kind: saleReturnKindEnum("kind").notNull(),
    valueTotal: decimal("value_total", { precision: 14, scale: 2 }).notNull(),
    notes: varchar("notes", { length: 500 }),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("sales_returns_enterprise_return_number_unique").on(
      t.enterprisesId,
      t.returnNumber,
    ),
    index("sales_returns_sale_id_idx").on(t.saleId),
    index("sales_returns_analytics_idx")
      .on(t.enterprisesId, t.createdAt)
      .where(sql`${t.status} = 'FINALIZADA'`),
  ],
);

export const salesReturnItems = pgTable(
  "sales_return_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    salesReturnId: uuid("sales_return_id")
      .notNull()
      .references(() => salesReturns.id, { onDelete: "cascade" }),
    saleItemId: uuid("sale_item_id")
      .notNull()
      .references(() => salesItems.id, { onDelete: "restrict" }),
    quantity: decimal("quantity", { precision: 14, scale: 4 }).notNull(),
    valueUnit: decimal("value_unit", { precision: 14, scale: 4 }).notNull(),
    valueTotal: decimal("value_total", { precision: 14, scale: 4 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("sales_return_items_return_sale_item_unique").on(
      t.salesReturnId,
      t.saleItemId,
    ),
    check("sales_return_items_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

export const salesPayments = pgTable(
  "sales_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    valueTotal: decimal("value_total", { precision: 14, scale: 2 }).notNull(), // VALOR TOTAL DO PAGAMENTO
    paymentTypeId: uuid("payment_type_id")
      .notNull()
      .references(() => paymentTypes.id, { onDelete: "restrict" }), // TIPO DE PAGAMENTO
    salesId: uuid("sales_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }), // VENDA
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("sales_payments_sales_id_payment_type_id_unique").on(
      t.salesId,
      t.paymentTypeId,
    ),
  ],
);

export const salesDues = pgTable(
  "sales_dues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    valueInstallment: decimal("value_installment", {
      precision: 14,
      scale: 2,
    }).notNull(), // VALOR DA PARCELA
    dueDate: tz("due_date").notNull(), // DATA DE VENCIMENTO
    salesPaymentId: uuid("sales_payment_id")
      .notNull()
      .references(() => salesPayments.id, { onDelete: "cascade" }), // PAGAMENTO
    salesId: uuid("sales_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }), // VENDA
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("sales_dues_sales_payment_id_due_date_unique").on(
      t.salesPaymentId,
      t.dueDate,
    ),
    index("sales_dues_due_date_idx").on(t.dueDate),
  ],
);
