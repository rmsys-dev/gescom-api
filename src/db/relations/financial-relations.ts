import { relations } from "drizzle-orm";
import {
  bankCollectionAgreements,
  bankRemittanceItems,
  bankRemittances,
  bankReturnItems,
  bankReturns,
  bankSlipEvents,
  bankSlips,
  financialInstallments,
  financialSettlements,
  financialTitleOrigins,
  financialTitles,
  memberCredits,
} from "../entities/financial.js";
import { enterprises } from "../entities/enterprises.js";
import { enterprisesMembers } from "../entities/members.js";
import { sales } from "../entities/sales.js";
import { nfeHeaders } from "../entities/nfe.js";

export const financialTitlesRelations = relations(financialTitles, ({ one, many }) => ({
  enterprise: one(enterprises, {
    fields: [financialTitles.enterpriseId],
    references: [enterprises.id],
  }),
  member: one(enterprisesMembers, {
    fields: [financialTitles.memberId],
    references: [enterprisesMembers.id],
  }),
  nfeHeader: one(nfeHeaders, {
    fields: [financialTitles.nfeHeaderId],
    references: [nfeHeaders.id],
  }),
  consolidatedInto: one(financialTitles, {
    fields: [financialTitles.consolidatedIntoId],
    references: [financialTitles.id],
  }),
  installments: many(financialInstallments),
  origins: many(financialTitleOrigins),
  settlements: many(financialSettlements),
}));

export const financialInstallmentsRelations = relations(
  financialInstallments,
  ({ one, many }) => ({
    title: one(financialTitles, {
      fields: [financialInstallments.titleId],
      references: [financialTitles.id],
    }),
    settlements: many(financialSettlements),
    slips: many(bankSlips),
  }),
);

export const financialTitleOriginsRelations = relations(
  financialTitleOrigins,
  ({ one }) => ({
    title: one(financialTitles, {
      fields: [financialTitleOrigins.titleId],
      references: [financialTitles.id],
    }),
    sale: one(sales, {
      fields: [financialTitleOrigins.salesId],
      references: [sales.id],
    }),
    nfeHeader: one(nfeHeaders, {
      fields: [financialTitleOrigins.nfeHeaderId],
      references: [nfeHeaders.id],
    }),
  }),
);

export const memberCreditsRelations = relations(memberCredits, ({ one, many }) => ({
  enterprise: one(enterprises, {
    fields: [memberCredits.enterpriseId],
    references: [enterprises.id],
  }),
  member: one(enterprisesMembers, {
    fields: [memberCredits.memberId],
    references: [enterprisesMembers.id],
  }),
  settlements: many(financialSettlements),
}));

export const financialSettlementsRelations = relations(
  financialSettlements,
  ({ one }) => ({
    title: one(financialTitles, {
      fields: [financialSettlements.titleId],
      references: [financialTitles.id],
    }),
    installment: one(financialInstallments, {
      fields: [financialSettlements.installmentId],
      references: [financialInstallments.id],
    }),
    credit: one(memberCredits, {
      fields: [financialSettlements.memberCreditId],
      references: [memberCredits.id],
    }),
  }),
);

export const bankCollectionAgreementsRelations = relations(
  bankCollectionAgreements,
  ({ one, many }) => ({
    enterprise: one(enterprises, {
      fields: [bankCollectionAgreements.enterpriseId],
      references: [enterprises.id],
    }),
    slips: many(bankSlips),
    remittances: many(bankRemittances),
    returns: many(bankReturns),
  }),
);

export const bankSlipsRelations = relations(bankSlips, ({ one, many }) => ({
  installment: one(financialInstallments, {
    fields: [bankSlips.installmentId],
    references: [financialInstallments.id],
  }),
  agreement: one(bankCollectionAgreements, {
    fields: [bankSlips.agreementId],
    references: [bankCollectionAgreements.id],
  }),
  events: many(bankSlipEvents),
}));

export const bankSlipEventsRelations = relations(bankSlipEvents, ({ one }) => ({
  slip: one(bankSlips, {
    fields: [bankSlipEvents.slipId],
    references: [bankSlips.id],
  }),
}));

export const bankRemittancesRelations = relations(bankRemittances, ({ one, many }) => ({
  agreement: one(bankCollectionAgreements, {
    fields: [bankRemittances.agreementId],
    references: [bankCollectionAgreements.id],
  }),
  items: many(bankRemittanceItems),
}));

export const bankRemittanceItemsRelations = relations(bankRemittanceItems, ({ one }) => ({
  remittance: one(bankRemittances, {
    fields: [bankRemittanceItems.remittanceId],
    references: [bankRemittances.id],
  }),
  slip: one(bankSlips, {
    fields: [bankRemittanceItems.slipId],
    references: [bankSlips.id],
  }),
}));

export const bankReturnsRelations = relations(bankReturns, ({ one, many }) => ({
  agreement: one(bankCollectionAgreements, {
    fields: [bankReturns.agreementId],
    references: [bankCollectionAgreements.id],
  }),
  items: many(bankReturnItems),
}));

export const bankReturnItemsRelations = relations(bankReturnItems, ({ one }) => ({
  bankReturn: one(bankReturns, {
    fields: [bankReturnItems.returnId],
    references: [bankReturns.id],
  }),
  slip: one(bankSlips, {
    fields: [bankReturnItems.slipId],
    references: [bankSlips.id],
  }),
}));
