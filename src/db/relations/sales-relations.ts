import { relations } from "drizzle-orm";
import {
  paymentTypes,
  salesPayments,
  sales,
  salesItems,
  salesBudgetConversions,
  salesBudgetConversionItems,
  salesBudgetUnclosedItems,
  salesReturns,
  salesDues,
  salesMembers,
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
import {
  stockSectors,
  stockLocations,
  stockBatches,
} from "../entities/stock.js";
import { mechanicSalesItems, vehiclesEnterprisesMembers } from "../entities/workOrders.js";

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
  budgetConversions: many(salesBudgetConversions, {
    relationName: "budgetConversions",
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
  stockSector: one(stockSectors, {
    fields: [salesItems.stockSectorId],
    references: [stockSectors.id],
  }),
  stockLocation: one(stockLocations, {
    fields: [salesItems.stockLocationId],
    references: [stockLocations.id],
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

// relações da tabela de CONVERSOES ORCAMENTO -> VENDA (historico auditavel).
export const salesBudgetConversionsRelations = relations(
  salesBudgetConversions,
  ({ one, many }) => ({
    budgetSale: one(sales, {
      fields: [salesBudgetConversions.budgetSaleId],
      references: [sales.id],
      relationName: "budgetConversions",
    }),
    generatedSale: one(sales, {
      fields: [salesBudgetConversions.generatedSaleId],
      references: [sales.id],
    }),
    enterprises: one(enterprises, {
      fields: [salesBudgetConversions.enterprisesId],
      references: [enterprises.id],
    }),
    user: one(users, {
      fields: [salesBudgetConversions.userId],
      references: [users.id],
    }),
    items: many(salesBudgetConversionItems),
    unclosedItems: many(salesBudgetUnclosedItems),
  }),
);

// relações da tabela de ITENS DA CONVERSAO ORCAMENTO -> VENDA (historico auditavel).
export const salesBudgetConversionItemsRelations = relations(
  salesBudgetConversionItems,
  ({ one }) => ({
    conversion: one(salesBudgetConversions, {
      fields: [salesBudgetConversionItems.conversionId],
      references: [salesBudgetConversions.id],
    }),
    budgetItem: one(salesItems, {
      fields: [salesBudgetConversionItems.budgetItemId],
      references: [salesItems.id],
    }),
    saleItem: one(salesItems, {
      fields: [salesBudgetConversionItems.saleItemId],
      references: [salesItems.id],
    }),
  }),
);

export const salesBudgetUnclosedItemsRelations = relations(
  salesBudgetUnclosedItems,
  ({ one }) => ({
    conversion: one(salesBudgetConversions, {
      fields: [salesBudgetUnclosedItems.conversionId],
      references: [salesBudgetConversions.id],
    }),
    budgetItem: one(salesItems, {
      fields: [salesBudgetUnclosedItems.budgetItemId],
      references: [salesItems.id],
    }),
    user: one(users, {
      fields: [salesBudgetUnclosedItems.userId],
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
