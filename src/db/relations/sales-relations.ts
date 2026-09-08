import { relations } from "drizzle-orm";
import {
  paymentTypes,
  salesPayments,
  sales,
  salesItems,
  saleConversions,
  saleConversionItems,
  saleUnclosedItems,
  salesReturns,
  salesDues,
  salesMembers,
  vehicles,
} from "../entities/sales.js";
import { users } from "../entities/users.js";
import { enterprisesMembers } from "../entities/members.js";
import { enterprises } from "../entities/enterprises.js";
import {
  measurementUnits,
  productTypes,
  productsEnterprises,
  promotionalPrices,
} from "../entities/products.js";
import { stockBatches } from "../entities/stock.js";
import { locations, sectors } from "../entities/sector.js";
import {
  mechanicSalesItems,
  vehiclesEnterprisesMembers,
} from "../entities/sales.js";
import { states } from "../entities/addresses.js";

// relações da tabela de TIPOS DE PAGAMENTO.
export const paymentTypesRelations = relations(paymentTypes, ({ many }) => ({
  salesPayments: many(salesPayments),
}));

// relações da tabela de VENDAS.
export const salesRelations = relations(sales, ({ one, many }) => ({
  user: one(users, {
    fields: [sales.userId],
    references: [users.id],
    relationName: "saleOperator",
  }),
  seller: one(users, {
    fields: [sales.sellerId],
    references: [users.id],
    relationName: "saleSeller",
  }),
  member: one(enterprisesMembers, {
    fields: [sales.memberId],
    references: [enterprisesMembers.id],
  }),
  enterprises: one(enterprises, {
    fields: [sales.enterprisesId],
    references: [enterprises.id],
  }),
  sourceBudgetSale: one(sales, {
    fields: [sales.sourceBudgetSaleId],
    references: [sales.id],
    relationName: "budgetGeneratedSales",
  }),
  generatedSalesFromBudget: many(sales, {
    relationName: "budgetGeneratedSales",
  }),
  sourceWorkOrderSale: one(sales, {
    fields: [sales.sourceWorkOrderSaleId],
    references: [sales.id],
    relationName: "workOrderGeneratedSales",
  }),
  generatedSalesFromWorkOrder: many(sales, {
    relationName: "workOrderGeneratedSales",
  }),
  items: many(salesItems),
  payments: many(salesPayments),
  returns: many(salesReturns),
  budgetConversions: many(saleConversions, {
    relationName: "budgetConversions",
  }),
  workOrderConversions: many(saleConversions, {
    relationName: "workOrderConversions",
  }),
  generatedFromConversions: many(saleConversions, {
    relationName: "generatedFromConversions",
  }),
  saleMember: one(salesMembers, {
    fields: [sales.id],
    references: [salesMembers.salesId],
  }),
  vehiclesEnterprisesMembers: one(vehiclesEnterprisesMembers, {
    fields: [sales.vehiclesEnterprisesMembersId],
    references: [vehiclesEnterprisesMembers.id],
  }),
}));

export const salesMembersRelations = relations(salesMembers, ({ one }) => ({
  sale: one(sales, {
    fields: [salesMembers.salesId],
    references: [sales.id],
  }),
}));

export const salesItemsRelations = relations(salesItems, ({ one, many }) => ({
  user: one(users, {
    fields: [salesItems.userId],
    references: [users.id],
    relationName: "saleItemOperator",
  }),
  seller: one(users, {
    fields: [salesItems.sellerId],
    references: [users.id],
    relationName: "saleItemSeller",
  }),
  productsEnterprises: one(productsEnterprises, {
    fields: [salesItems.productsEnterprisesId],
    references: [productsEnterprises.id],
  }),
  promotionalPrice: one(promotionalPrices, {
    fields: [salesItems.promotionalPriceId],
    references: [promotionalPrices.id],
  }),
  sale: one(sales, {
    fields: [salesItems.salesId],
    references: [sales.id],
  }),
  unit: one(measurementUnits, {
    fields: [salesItems.unitid],
    references: [measurementUnits.id],
  }),
  productType: one(productTypes, {
    fields: [salesItems.productTypeId],
    references: [productTypes.id],
  }),
  sector: one(sectors, {
    fields: [salesItems.sectorId],
    references: [sectors.id],
  }),
  location: one(locations, {
    fields: [salesItems.locationsId],
    references: [locations.id],
  }),
  stockBatch: one(stockBatches, {
    fields: [salesItems.stockBatchId],
    references: [stockBatches.id],
  }),
  returns: many(salesReturns),
  sourceBudgetItem: one(salesItems, {
    fields: [salesItems.sourceBudgetItemId],
    references: [salesItems.id],
    relationName: "budgetConversionItems",
  }),
  generatedSaleItemsFromBudget: many(salesItems, {
    relationName: "budgetConversionItems",
  }),
  sourceWorkOrderItem: one(salesItems, {
    fields: [salesItems.sourceWorkOrderItemId],
    references: [salesItems.id],
    relationName: "workOrderConversionItems",
  }),
  generatedSaleItemsFromWorkOrder: many(salesItems, {
    relationName: "workOrderConversionItems",
  }),
  mechanics: many(mechanicSalesItems),
}));

// relações da tabela de CONVERSOES (orçamento/OS -> venda, historico auditavel).
export const saleConversionsRelations = relations(
  saleConversions,
  ({ one, many }) => ({
    budgetSale: one(sales, {
      fields: [saleConversions.budgetSaleId],
      references: [sales.id],
      relationName: "budgetConversions",
    }),
    workOrderSale: one(sales, {
      fields: [saleConversions.workOrderSaleId],
      references: [sales.id],
      relationName: "workOrderConversions",
    }),
    generatedSale: one(sales, {
      fields: [saleConversions.generatedSaleId],
      references: [sales.id],
      relationName: "generatedFromConversions",
    }),
    enterprises: one(enterprises, {
      fields: [saleConversions.enterprisesId],
      references: [enterprises.id],
    }),
    user: one(users, {
      fields: [saleConversions.userId],
      references: [users.id],
    }),
    items: many(saleConversionItems),
    unclosedItems: many(saleUnclosedItems),
  }),
);

// relações da tabela de ITENS DA CONVERSAO (historico auditavel).
export const saleConversionItemsRelations = relations(
  saleConversionItems,
  ({ one }) => ({
    conversion: one(saleConversions, {
      fields: [saleConversionItems.saleConversionId],
      references: [saleConversions.id],
    }),
    saleItem: one(salesItems, {
      fields: [saleConversionItems.saleItemId],
      references: [salesItems.id],
    }),
  }),
);

export const saleUnclosedItemsRelations = relations(
  saleUnclosedItems,
  ({ one }) => ({
    conversion: one(saleConversions, {
      fields: [saleUnclosedItems.saleConversionId],
      references: [saleConversions.id],
    }),
    saleItem: one(salesItems, {
      fields: [saleUnclosedItems.saleItemId],
      references: [salesItems.id],
    }),
    user: one(users, {
      fields: [saleUnclosedItems.userId],
      references: [users.id],
    }),
  }),
);

// relações da tabela de DEVOLUCOES DE VENDA (linha = item devolvido).
export const salesReturnsRelations = relations(salesReturns, ({ one }) => ({
  sale: one(sales, {
    fields: [salesReturns.salesId],
    references: [sales.id],
  }),
  saleItem: one(salesItems, {
    fields: [salesReturns.saleItemId],
    references: [salesItems.id],
  }),
  user: one(users, {
    fields: [salesReturns.userId],
    references: [users.id],
  }),
}));

// relações da tabela de VENDAS PAGAMENTOS.
export const salesPaymentsRelations = relations(
  salesPayments,
  ({ one, many }) => ({
    paymentType: one(paymentTypes, {
      fields: [salesPayments.paymentTypeId],
      references: [paymentTypes.id],
    }),
    sales: one(sales, {
      fields: [salesPayments.salesId],
      references: [sales.id],
    }),
    dues: many(salesDues, { relationName: "salesPaymentsDues" }), // VENCIMENTOS
  }),
);

// relações da tabela de VENDAS VENCIMENTOS.
export const salesDuesRelations = relations(salesDues, ({ one, many }) => ({
  // PAGAMENTO
  salesPayment: one(salesPayments, {
    fields: [salesDues.salesPaymentId],
    references: [salesPayments.id],
  }),
  sales: one(sales, {
    fields: [salesDues.salesId],
    references: [sales.id],
  }),
  salesItems: many(salesItems, { relationName: "salesDuesSalesItems" }), // ITENS DA VENDA
}));

//**RELAÇÕES DE VEÍCULOS**//
export const vehiclesRelations = relations(vehicles, ({ one, many }) => ({
  licensingState: one(states, {
    fields: [vehicles.licensingStateId],
    references: [states.id],
  }),
  enterprisesMembers: many(vehiclesEnterprisesMembers),
}));

//**RELAÇÕES DE RELACIONAMENTO ENTRE VEÍCULOS E EMPRESAS**//
export const vehiclesEnterprisesMembersRelations = relations(
  vehiclesEnterprisesMembers,
  ({ one }) => ({
    vehicle: one(vehicles, {
      fields: [vehiclesEnterprisesMembers.vehiclesId],
      references: [vehicles.id],
    }),
    enterpriseMember: one(enterprisesMembers, {
      fields: [vehiclesEnterprisesMembers.enterprisesMembersId],
      references: [enterprisesMembers.id],
    }),
  }),
);

//**RELAÇÕES DE MECÂNICO × ITEM DE VENDA**//
export const mechanicSalesItemsRelations = relations(
  mechanicSalesItems,
  ({ one }) => ({
    mechanicMember: one(enterprisesMembers, {
      fields: [mechanicSalesItems.mechanic],
      references: [enterprisesMembers.id],
    }),
    salesItem: one(salesItems, {
      fields: [mechanicSalesItems.salesItemsId],
      references: [salesItems.id],
    }),
  }),
);
