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
  saleOriginEnum,
  saleTypeEnum,
  statusEnum,
  paymentTypeEnum,
  saleServiceTypeEnum,
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
import { tz, percentageDecimal, valorDuasCasasDecimais, valorQuatroCasasDecimais } from "../functions.js";

// TIPOS DE PAGAMENTO.
export const paymentTypes = pgTable(
  "payment_types",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    description: varchar("description", { length: 255 }).notNull(),
    status: statusEnum("status").notNull().default("ATIVO"),
    paymentType: paymentTypeEnum("payment_type").notNull(),  
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("payment_types_description_active_unique")
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
    sellerId: uuid("seller_id") 
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    sellerLegalName: varchar("seller_legal_name", { length: 255 }).notNull(), 
    memberId: uuid("member_id").references(() => enterprisesMembers.id, { 
      onDelete: "restrict",
    }),
    type: saleTypeEnum("type").notNull(), 
    subTotal: decimal("sub_total", valorDuasCasasDecimais).notNull(),
    discountValuetems: decimal("discount_value_items", valorDuasCasasDecimais), // valor do desconto nos itens
    valueAcresceItems: decimal("value_acresce_items", valorDuasCasasDecimais), // valor do acrescimo nos itens
    percentageDiscountPie: decimal("percentage_discount_pie", percentageDecimal), // percentagem de desconto financeiro em pecas
    valueDiscountFinancialPie: decimal("value_discount_financial_pie", valorDuasCasasDecimais), // valor do desconto financeiro em pecas
    percentageDiscountService: decimal("percentage_discount_service", percentageDecimal), // percentagem de desconto financeiro em servicos
    valueDiscountFinancialService: decimal("value_discount_financial_service", valorDuasCasasDecimais), // valor do desconto financeiro em servicos
    percentageAcrescePie: decimal("percentage_acresce_pie", percentageDecimal), // percentagem de acrescimo financeiro em pecas
    valueAcresceFinancialPie: decimal("value_acresce_financial_pie", valorDuasCasasDecimais), // valor do acrescimo financeiro em pecas
    percentageAcresceService: decimal("percentage_acresce_service", percentageDecimal), // percentagem de acrescimo financeiro em servicos
    valueAcresceFinancialService: decimal("value_acresce_financial_service", valorDuasCasasDecimais), // valor do acrescimo financeiro em servicos
    valuePie: decimal("value_pie", valorDuasCasasDecimais), // valor do Peças
    valueService: decimal("value_service", valorDuasCasasDecimais), // valor do serviço
    valueLiquid: decimal("value_liquid", valorDuasCasasDecimais), // valor líquido
    status: saleStatusEnum("status").notNull(), // status da venda
    returnSituation: saleReturnSituationEnum("return_situation")
      .notNull()
      .default("SEM_DEVOLUCAO"), // situação de devolução
    budgetClosureSituation: budgetClosureSituationEnum(
      "budget_closure_situation",
    )
      .notNull()
      .default("ABERTO"),  // situação de fechamento do orçamento
    sourceBudgetSaleId: uuid("source_budget_sale_id").references( 
      (): AnyPgColumn => sales.id,
      { onDelete: "restrict" },
    ), 
    origin: saleOriginEnum("origin").default("WEB"), // origem da venda
    completedionDate: date("completedion_date", { mode: "date" }), // data de finalização da venda    
    vehicleMileage: integer("vehicle_mileage"), // quilometragem do veículo
    observations: varchar("observations", { length: 500 }), // observações
    defect: varchar("defect", { length: 500 }), // defeito ( problema no equipamento/veiculo)
    serviceType: saleServiceTypeEnum("service_type").notNull().default("SERVICO"), // tipo de serviço  
    userModificationServiceId: uuid("user_modification_service_id").references(() => users.id, { onDelete: "restrict" }), // usuário que modificou o serviço
    userClosedServiceId: uuid("user_closed_service_id").references(() => users.id, { onDelete: "restrict" }), // usuário que fechou o serviço
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
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
    index("sales_seller_id_idx").on(t.enterprisesId, t.sellerId),
  ],
);

// VENDAS ITENS.
export const salesItems = pgTable(
  "sales_items",
  {
  id: uuid("id").defaultRandom().primaryKey(),
  quantity: decimal("quantity", valorQuatroCasasDecimais).notNull(),
  valueUnit: decimal("value_unit", valorQuatroCasasDecimais).notNull(), 
  valueDiscount: decimal("value_discount", valorQuatroCasasDecimais).notNull(), 
  valueAcresce: decimal("value_acresce", valorQuatroCasasDecimais).notNull(),
  valueTotal: decimal("value_total", valorQuatroCasasDecimais).notNull(),
  averageCost: decimal("average_cost", valorQuatroCasasDecimais), // custo médio
  actualRealCost: decimal("actual_real_cost", valorQuatroCasasDecimais), // custo real
  priceCost: decimal("price_cost", valorQuatroCasasDecimais), // custo atual
  priceSale: decimal("price_sale", valorQuatroCasasDecimais), // preço de venda
    
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
  quantityReturned: decimal("quantity_returned", valorQuatroCasasDecimais)
    .notNull()
    .default("0"),
  quantityConverted: decimal("quantity_converted", valorQuatroCasasDecimais)
    .notNull()
    .default("0"),
  sourceBudgetItemId: uuid("source_budget_item_id").references(
    (): AnyPgColumn => salesItems.id,
    { onDelete: "restrict" },
  ),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),
  userLegalName: varchar("user_legal_name", { length: 255 }).notNull(), // NOME LEGAL DO USUÁRIO
  sellerId: uuid("seller_id")
    .notNull()
    .references(() => users.id, { onDelete: "restrict" }),  // VENDEDOR
  sellerLegalName: varchar("seller_legal_name", { length: 255 }).notNull(), // NOME LEGAL DO VENDEDOR
  PercentageComissionSeller: decimal("percentage_comission_seller", percentageDecimal).notNull().default("0.00"),  // Percentagem de comissão do vendedor
  PercentageComissionManager: decimal("percentage_comission_manager", percentageDecimal).notNull().default("0.00"),  // Percentagem de comissão do gerente
  origin: saleOriginEnum("origin").notNull().default("WEB"),  // origem da venda
  createdAt: tz("created_at").defaultNow().notNull(), // data de criação da venda
  updatedAt: tz("updated_at"), // data de atualização da venda
  },
  (t) => [
    index("sales_items_products_enterprises_id_idx").on(
      t.productsEnterprisesId,
    ),
    index("sales_items_seller_id_idx").on(t.sellerId),
  ],
);

// Membros da venda.
export const salesMembers = pgTable(
  "sales_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    salesId: uuid("sales_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }), 
    memberLegalName: varchar("member_legal_name", { length: 255 }),  // nome legal do membro
    memberAddress: varchar("member_address", { length: 255 }),  // endereço do membro
    memberSector: varchar("member_sector", { length: 255 }),  // setor do membro
    memberCep: varchar("member_cep", { length: 8 }),  // cep do membro
    memberCity: varchar("member_city", { length: 255 }),  // cidade do membro
    memberState: varchar("member_state", { length: 2 }),  // estado do membro'
    registration: varchar("registration", { length: 14 }), // CPF/CNPJ
    memberPhone: varchar("member_phone", { length: 20 }), // telefone do membro
    memberMobile: varchar("member_mobile", { length: 20 }), // celular do membro
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("sales_members_sales_id_unique").on(t.salesId),
  ],
);

// CONVERSOES ORCAMENTO -> VENDA (historico auditavel).
export const salesBudgetConversions = pgTable(
  "sales_budget_conversions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
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

// Itens da conversão de orçamento para venda (historico auditavel).
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
    quantity: decimal("quantity", valorQuatroCasasDecimais).notNull(),
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

// Itens não convertidos em venda (historico auditavel).
export const salesBudgetUnclosedItems = pgTable(   
  "sales_budget_unclosed_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversionId: uuid("conversion_id")
      .notNull()
      .references(() => salesBudgetConversions.id, { onDelete: "cascade" }),
    budgetItemId: uuid("budget_item_id")
      .notNull()
      .references(() => salesItems.id, { onDelete: "restrict" }),
    quantityNotConverted: decimal("quantity_not_converted", valorQuatroCasasDecimais).notNull(),
    justification: varchar("justification", { length: 500 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    userLegalName: varchar("user_legal_name", { length: 255 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex(
      "sales_budget_unclosed_items_conversion_budget_item_unique",
    ).on(t.conversionId, t.budgetItemId),
    check(
      "sales_budget_unclosed_items_quantity_positive",
      sql`${t.quantityNotConverted} > 0`,
    ),
  ],
);

// DEVOLUÇÕES DE VENDA.
export const salesReturns = pgTable(
  "sales_returns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    returnNumber: integer("return_number").notNull(),
    saleId: uuid("sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    status: saleReturnStatusEnum("status").notNull().default("ABERTA"),
    kind: saleReturnKindEnum("kind").notNull(),
    valueTotal: decimal("value_total", valorDuasCasasDecimais).notNull(),
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

// Itens da devolução de venda (historico auditavel).
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
    quantity: decimal("quantity", valorQuatroCasasDecimais).notNull(),
    valueUnit: decimal("value_unit", valorQuatroCasasDecimais).notNull(),
    valueTotal: decimal("value_total", valorDuasCasasDecimais).notNull(),
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

// PAGAMENTOS DE VENDA.
export const salesPayments = pgTable(
  "sales_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    valueTotal: decimal("value_total", valorDuasCasasDecimais).notNull(), // VALOR TOTAL DO PAGAMENTO
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

// PARCELAS DE PAGAMENTO DE VENDA.
export const salesDues = pgTable(
  "sales_dues",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    valueInstallment: decimal("value_installment", valorDuasCasasDecimais).notNull(), // VALOR DA PARCELA
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
