import { relations } from "drizzle-orm";
import {
  marketplacePaymentConfigs,
  marketplacePaymentEvents,
  marketplacePayments,
} from "../entities/marketplace-payments.js";
import { marketplaceOrders } from "../entities/marketplace-products.js";
import { enterprises } from "../entities/enterprises.js";

export const marketplacePaymentConfigsRelations = relations(
  marketplacePaymentConfigs,
  ({ one, many }) => ({
    enterprise: one(enterprises, {
      fields: [marketplacePaymentConfigs.enterprisesId],
      references: [enterprises.id],
    }),
    payments: many(marketplacePayments),
  }),
);

export const marketplacePaymentsRelations = relations(
  marketplacePayments,
  ({ one, many }) => ({
    enterprise: one(enterprises, {
      fields: [marketplacePayments.enterprisesId],
      references: [enterprises.id],
    }),
    order: one(marketplaceOrders, {
      fields: [marketplacePayments.orderId],
      references: [marketplaceOrders.id],
    }),
    config: one(marketplacePaymentConfigs, {
      fields: [marketplacePayments.configId],
      references: [marketplacePaymentConfigs.id],
    }),
    events: many(marketplacePaymentEvents),
  }),
);

export const marketplacePaymentEventsRelations = relations(
  marketplacePaymentEvents,
  ({ one }) => ({
    payment: one(marketplacePayments, {
      fields: [marketplacePaymentEvents.paymentId],
      references: [marketplacePayments.id],
    }),
  }),
);
