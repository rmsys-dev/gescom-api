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
  saleReturnSituationEnum,
  saleStatusEnum,
  saleOriginEnum,
  saleTypeEnum,
  statusEnum,
  paymentTypeEnum,
  saleServiceTypeEnum,
  orderServiceModelEnum,
  typeServiceEnum,
  fuelTypeEnum,
  ownerTypeEnum,
  vehicleTypeEnum,
  bodyTypeEnum,
  axleTypeEnum,
  saleConversionTypeEnum,
  saleConversionClosureKindEnum,
} from "../enums.js";
import { users } from "./users.js";
import { enterprisesMembers } from "./members.js";
import { enterprises } from "./enterprises.js";
import { states } from "./addresses.js";
import {
  measurementUnits,
  productTypes,
  productsEnterprises,
  promotionalPrices,
} from "./products.js";
import { stockSectors, stockLocations, stockBatches } from "./stock.js";
import {
  tz,
  percentageDecimal,
  valorDuasCasasDecimais,
  valorQuatroCasasDecimais,
} from "../functions.js";

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
    uniqueIndex("payment_types_description_active_unique").on(t.description),
  ],
);

// VENDAS.
export const sales = pgTable(
  "sales",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    orderNumber: integer("order_number").notNull(), // número da venda
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }), // usuário que criou a venda
    userLegalName: varchar("user_legal_name", { length: 255 }).notNull(), // nome legal do usuário que criou a venda
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }), // vendedor da venda
    sellerLegalName: varchar("seller_legal_name", { length: 255 }).notNull(), // nome legal do vendedor da venda
    memberId: uuid("member_id")
      .notNull()
      .references(() => enterprisesMembers.id, {
        onDelete: "restrict",
      }), // membro da venda
    type: saleTypeEnum("type").notNull(), // tipo de venda
    modelService: orderServiceModelEnum("model_service"), // modelo de ordem servico
    subTotal: decimal("sub_total", valorDuasCasasDecimais).notNull(), // subtotal da venda
    discountValuetems: decimal("discount_value_items", valorDuasCasasDecimais), // valor do desconto nos itens
    valueAcresceItems: decimal("value_acresce_items", valorDuasCasasDecimais), // valor do acrescimo nos itens
    percentageDiscountProduct: decimal(
      "percentage_discount_product",
      percentageDecimal,
    ), // percentagem de desconto financeiro em pecas
    valueDiscountFinancialProduct: decimal(
      "value_discount_financial_product",
      valorDuasCasasDecimais,
    ), // valor do desconto financeiro em pecas
    percentageDiscountService: decimal(
      "percentage_discount_service",
      percentageDecimal,
    ), // percentagem de desconto financeiro em servicos
    valueDiscountFinancialService: decimal(
      "value_discount_financial_service",
      valorDuasCasasDecimais,
    ), // valor do desconto financeiro em servicos
    percentageAcresceProduct: decimal(
      "percentage_acresce_product",
      percentageDecimal,
    ), // percentagem de acrescimo financeiro em pecas
    valueAcresceFinancialProduct: decimal(
      "value_acresce_financial_product",
      valorDuasCasasDecimais,
    ), // valor do acrescimo financeiro em pecas
    percentageAcresceService: decimal(
      "percentage_acresce_service",
      percentageDecimal,
    ), // percentagem de acrescimo financeiro em servicos
    valueAcresceFinancialService: decimal(
      "value_acresce_financial_service",
      valorDuasCasasDecimais,
    ), // valor do acrescimo financeiro em servicos
    valueProduct: decimal("value_product", valorDuasCasasDecimais), // valor do produto
    valueService: decimal("value_service", valorDuasCasasDecimais), // valor do serviço
    valueLiquid: decimal("value_liquid", valorDuasCasasDecimais), // valor líquido
    status: saleStatusEnum("status").notNull(), // status
    returnSituation: saleReturnSituationEnum("return_situation")
      .notNull()
      .default("SEM_DEVOLUCAO"), // situação de devolução
    sourceBudgetSaleId: uuid("source_budget_sale_id").references(
      (): AnyPgColumn => sales.id,
      { onDelete: "restrict" },
    ), // orçamento de venda
    sourceWorkOrderSaleId: uuid("source_work_order_sale_id").references(
      (): AnyPgColumn => sales.id,
      { onDelete: "restrict" },
    ), // ordem de serviço de venda
    origin: saleOriginEnum("origin").default("WEB"), // origem da venda
    completedionDate: date("completedion_date", { mode: "date" }), // data de finalização da venda
    vehicleMileage: integer("vehicle_mileage").notNull().default(0), // quilometragem do veículo
    observations: varchar("observations", { length: 500 })
      .notNull()
      .default(""), // observações
    defect: varchar("defect", { length: 500 }).notNull().default(""), // defeito ( problema no equipamento/veiculo)
    serviceType: saleServiceTypeEnum("service_type")
      .notNull()
      .default("SERVICO"), // tipo de serviço
    userModificationServiceId: uuid("user_modification_service_id").references(
      () => users.id,
      { onDelete: "restrict" },
    ), // usuário que modificou o serviço
    userClosedServiceId: uuid("user_closed_service_id").references(
      () => users.id,
      { onDelete: "restrict" },
    ), // usuário que fechou o serviço
    // Nullable para vendas legadas; obrigatório na criação via API (Zod).
    vehiclesEnterprisesMembersId: uuid(
      "vehicles_enterprises_members_id",
    ).references(() => vehiclesEnterprisesMembers.id, { onDelete: "restrict" }), // veículo da venda
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
    index("sales_source_work_order_sale_id_idx").on(t.sourceWorkOrderSaleId),
    index("sales_vehicles_enterprises_members_id_idx").on(
      t.vehiclesEnterprisesMembersId,
    ),
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
    valueDiscount: decimal(
      "value_discount",
      valorQuatroCasasDecimais,
    ).notNull(),
    valueAcresce: decimal("value_acresce", valorQuatroCasasDecimais).notNull(),
    valueTotal: decimal("value_total", valorQuatroCasasDecimais).notNull(),
    /** Líquido para devolução (linha + rateio do financeiro de peça). 0 enquanto ABERTA. */
    valueLiquidItemsHeader: decimal(
      "value_liquid_items_header",
      valorQuatroCasasDecimais,
    )
      .notNull()
      .default("0"),
    /** Descrição livre do item (ex.: serviço no orçamento); null = usa cadastro do produto. */
    description: varchar("description", { length: 255 }),
    averageCost: decimal("average_cost", valorQuatroCasasDecimais), // custo médio
    actualRealCost: decimal("actual_real_cost", valorQuatroCasasDecimais), // custo real
    priceCost: decimal("price_cost", valorQuatroCasasDecimais), // custo atual
    priceSale: decimal("price_sale", valorQuatroCasasDecimais), // preço de venda (efetivo: promo ou tabela)
    promotionalPriceId: uuid("promotional_price_id").references(
      () => promotionalPrices.id,
      { onDelete: "set null" },
    ), // promoção aplicada no item (se houver)

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
    ), // item de orçamento
    sourceWorkOrderItemId: uuid("source_work_order_item_id").references(
      (): AnyPgColumn => salesItems.id,
      { onDelete: "restrict" },
    ), // item de ordem de serviço
    typeService: typeServiceEnum("type_service").notNull().default("PROPRIO"), // tipo de serviço (PROPRIO, OUTROS)
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    userLegalName: varchar("user_legal_name", { length: 255 }).notNull(), // NOME LEGAL DO USUÁRIO
    sellerId: uuid("seller_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }), // VENDEDOR
    sellerLegalName: varchar("seller_legal_name", { length: 255 }).notNull(), // NOME LEGAL DO VENDEDOR
    PercentageComissionSeller: decimal(
      "percentage_comission_seller",
      percentageDecimal,
    )
      .notNull()
      .default("0.00"), // Percentagem de comissão do vendedor
    PercentageComissionManager: decimal(
      "percentage_comission_manager",
      percentageDecimal,
    )
      .notNull()
      .default("0.00"), // Percentagem de comissão do gerente
    origin: saleOriginEnum("origin").notNull().default("WEB"), // origem da venda
    createdAt: tz("created_at").defaultNow().notNull(), // data de criação da venda
    updatedAt: tz("updated_at"), // data de atualização da venda
  },
  (t) => [
    index("sales_items_products_enterprises_id_idx").on(
      t.productsEnterprisesId,
    ),
    index("sales_items_seller_id_idx").on(t.sellerId),
    index("sales_items_promotional_price_id_idx").on(t.promotionalPriceId),
    index("sales_items_source_work_order_item_id_idx").on(
      t.sourceWorkOrderItemId,
    ),
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
    memberLegalName: varchar("member_legal_name", { length: 255 }), // nome legal do membro
    memberAddress: varchar("member_address", { length: 255 }), // endereço do membro
    memberSector: varchar("member_sector", { length: 255 }), // setor do membro
    memberCep: varchar("member_cep", { length: 8 }), // cep do membro
    memberCity: varchar("member_city", { length: 255 }), // cidade do membro
    memberState: varchar("member_state", { length: 2 }), // estado do membro'
    registration: varchar("registration", { length: 14 }), // CPF/CNPJ
    memberPhone: varchar("member_phone", { length: 20 }), // telefone do membro
    memberMobile: varchar("member_mobile", { length: 20 }), // celular do membro
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [uniqueIndex("sales_members_sales_id_unique").on(t.salesId)],
);

// Histórico de conversão de Orçamentos e Ordens de Serviço para Vendas (historico auditavel).
export const saleConversions = pgTable(
  "sale_conversions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    enterprisesId: uuid("enterprises_id")
      .notNull()
      .references(() => enterprises.id, { onDelete: "cascade" }),
    typeConversion: saleConversionTypeEnum("type_conversion").notNull(),
    workOrderSaleId: uuid("work_order_sale_id").references(() => sales.id, {
      onDelete: "restrict",
    }),
    budgetSaleId: uuid("budget_sale_id").references(() => sales.id, {
      onDelete: "restrict",
    }),
    generatedSaleId: uuid("generated_sale_id")
      .notNull()
      .references(() => sales.id, { onDelete: "restrict" }),
    closureKind: saleConversionClosureKindEnum("closure_kind").notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    userLegalName: varchar("user_legal_name", { length: 255 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
  },
  (t) => [
    index("sale_conversions_budget_sale_id_idx").on(t.budgetSaleId),
    index("sale_conversions_work_order_sale_id_idx").on(t.workOrderSaleId),
    index("sale_conversions_generated_sale_id_idx").on(t.generatedSaleId),
    index("sale_conversions_type_conversion_idx").on(t.typeConversion),
    check(
      "sale_conversions_source_by_type",
      sql`(
        (
          ${t.typeConversion} IN ('ORCAMENTO-VENDA', 'ORCAMENTO-ORDEM_SERVICO')
          AND ${t.budgetSaleId} IS NOT NULL
          AND ${t.workOrderSaleId} IS NULL
        )
        OR
        (
          ${t.typeConversion} = 'ORDEM_SERVICO-VENDA'
          AND ${t.workOrderSaleId} IS NOT NULL
          AND ${t.budgetSaleId} IS NULL
        )
      )`,
    ),
  ],
);

// Itens da conversão de Orçamentos e Ordens de Serviço para Vendas (historico auditavel).
export const saleConversionItems = pgTable(
  "sale_conversion_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    saleConversionId: uuid("sale_conversion_id")
      .notNull()
      .references(() => saleConversions.id, { onDelete: "cascade" }),
    saleItemId: uuid("sale_item_id")
      .notNull()
      .references(() => salesItems.id, { onDelete: "restrict" }),
    quantity: decimal("quantity", valorQuatroCasasDecimais).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex(
      "sale_conversion_items_sale_conversion_id_sale_item_id_unique",
    ).on(t.saleConversionId, t.saleItemId),
    check("sale_conversion_items_quantity_positive", sql`${t.quantity} > 0`),
  ],
);

// Itens não convertidos em Vendas (historico auditavel).
export const saleUnclosedItems = pgTable(
  "sale_unclosed_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    saleConversionId: uuid("sale_conversion_id")
      .notNull()
      .references(() => saleConversions.id, { onDelete: "cascade" }),
    saleItemId: uuid("sale_item_id")
      .notNull()
      .references(() => salesItems.id, { onDelete: "restrict" }),
    quantityNotConverted: decimal(
      "quantity_not_converted",
      valorQuatroCasasDecimais,
    ).notNull(),
    justification: varchar("justification", { length: 500 }).notNull(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    userLegalName: varchar("user_legal_name", { length: 255 }).notNull(),
    createdAt: tz("created_at").defaultNow().notNull(),
  },
  (t) => [
    uniqueIndex(
      "sale_unclosed_items_sale_conversion_id_sale_item_id_unique",
    ).on(t.saleConversionId, t.saleItemId),
    check(
      "sale_unclosed_items_quantity_positive",
      sql`${t.quantityNotConverted} > 0`,
    ),
  ],
);

// DEVOLUÇÕES DE VENDA.
export const salesReturns = pgTable(
  "sales_returns",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    returnOrder: integer("return_order").notNull(), // ORDEM DA DEVOLUÇÃO
    salesId: uuid("sales_id")
      .notNull()
      .references(() => sales.id, { onDelete: "cascade" }), // VENDA
    saleItemId: uuid("sale_item_id")
      .notNull()
      .references(() => salesItems.id, { onDelete: "restrict" }), // ITEM DA VENDA
    quantity: decimal("quantity", valorQuatroCasasDecimais).notNull(), // QUANTIDADE DA DEVOLUÇÃO
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }), // USUÁRIO
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("sales_returns_sales_id_return_order_unique").on(
      t.salesId,
      t.saleItemId,
      t.returnOrder,
    ),
    check("sales_returns_quantity_positive", sql`${t.quantity} > 0`), // QUANTIDADE DA DEVOLUÇÃO DEVE SER MAIOR QUE 0
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
    valueInstallment: decimal(
      "value_installment",
      valorDuasCasasDecimais,
    ).notNull(), // VALOR DA PARCELA
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
    uniqueIndex("sales_dues_sales_payment_id_due_date_sales_id_unique").on(
      t.salesId,
      t.salesPaymentId,
      t.dueDate,
    ),
  ],
);

export const vehicles = pgTable(
  "vehicles",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    plate: varchar("plate", { length: 255 }).notNull(), // Placa do veículo
    model: varchar("model", { length: 255 }), // Modelo do veículo
    color: varchar("color", { length: 255 }), // Cor do veículo
    fuelType: fuelTypeEnum("fuel_type").notNull().default("GASOLINA"), // Tipo de combustível
    ownerType: ownerTypeEnum("owner_type").notNull().default("PROPRIETARIO"), // Tipo de proprietário
    ipvaPaymentMonth: integer("ipva_payment_month"), // Mês de pagamento do IPVA
    vehicleYear: integer("vehicle_year"), // Ano do veículo (ex: 2020)
    renavam: varchar("renavam", { length: 255 }), // Renavam do veículo
    licensingStateId: uuid("licensing_state_id").references(() => states.id), // Estado do licenciamento
    tareWeight: decimal("tare_weight", valorQuatroCasasDecimais), // peso de tara do veiculo (ex: 1000.0000)
    capacityM3: decimal("capacity_m3", valorQuatroCasasDecimais), // capacidade do veículo em metros cúbicos (ex: 10.0000)
    capacityKg: decimal("capacity_kg", valorQuatroCasasDecimais), // capacidade do veículo em quilogramas (ex: 10000.0000)
    entireCode: varchar("entire_code", { length: 255 }), // código interno do veículo (ex: 1234567890)
    rntrcCode: varchar("rntrc_code", { length: 255 }), // código do RNTRC do veículo (ex: 1234567890)
    vehicleType: vehicleTypeEnum("vehicle_type").notNull().default("TRUCK"), // Tipo de veículo ( Truck, Toco, Van, Carroceria, Outros)
    bodyType: bodyTypeEnum("body_type").notNull().default("NAO_APLICAVEL"), // Tipo de carroceria ( Nao aplicavel, Aberta, Fechada, Semi-Fechada, Outros )
    axleType: axleTypeEnum("axle_type").notNull().default("VEICULO 2 EIXOS"), // Tipo de eixo ( Simples, Duplo, Triplo, Quadruplo, Outros )
    location: varchar("location", { length: 255 }), // Locação
    refuelingMileage: decimal("refueling_mileage", valorQuatroCasasDecimais), // Quilometragem de abastecimento (ex: 1000.0000)
    fleetNumber: varchar("fleet_number", { length: 255 }), // Número da frota do veículo
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [uniqueIndex("vehicles_plate_unique").on(t.plate)],
);

// tabela de relacionamento entre veículos e membros da empresa
export const vehiclesEnterprisesMembers = pgTable(
  "vehicles_enterprises_members",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    status: statusEnum("status").default("ATIVO").notNull(), // status do veiculo
    vehiclesId: uuid("vehicles_id")
      .references(() => vehicles.id)
      .notNull(), // veículo
    enterprisesMembersId: uuid("enterprises_members_id")
      .references(() => enterprisesMembers.id)
      .notNull(), // empresa membro
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("vehicles_enterprises_members_unique")
      .on(t.vehiclesId, t.enterprisesMembersId)
      .where(sql`${t.status} = 'ATIVO'`),
  ],
);

// tabela de relacionamento entre mecânico e item de venda
export const mechanicSalesItems = pgTable(
  "mechanic_sales_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    mechanic: uuid("mechanic")
      .references(() => enterprisesMembers.id)
      .notNull(), // mecânico da empresa membro
    salesItemsId: uuid("sales_items_id")
      .references(() => salesItems.id)
      .notNull(), // item de venda
    comissionService: decimal("comission_service", percentageDecimal) // comissão de serviço
      .notNull()
      .default("0.00"), // Comissão de serviço
    createdAt: tz("created_at").defaultNow().notNull(),
    updatedAt: tz("updated_at"),
  },
  (t) => [
    uniqueIndex("mechanic_sales_items_unique").on(t.mechanic, t.salesItemsId),
  ],
);
