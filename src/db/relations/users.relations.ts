import { relations } from "drizzle-orm";
import { ceps } from "../entities/addresses.js";
import { enterprisesMembers, userInvitations } from "../entities/members.js";
import {
  users,
  usersAddress,
  usersContact,
  usersFinancialInfo,
  usersPersonalInfo,
  usersRelationships,
  usersTaxInfos,
} from "../entities/users.js";
import {
  passwordResetTokens,
  usersCredentials,
  userSessions,
} from "../entities/authentication.js";

export const usersRelations = relations(users, ({ many, one }) => ({
  memberships: many(enterprisesMembers),
  credentials: many(usersCredentials),
  passwordResetTokens: many(passwordResetTokens),
  sessions: many(userSessions),
  personalInfo: one(usersPersonalInfo),
  addresses: many(usersAddress),
  contacts: many(usersContact),
  relationships: one(usersRelationships),
  taxInfos: one(usersTaxInfos),
  financialInfo: one(usersFinancialInfo),
}));

export const userInvitationsRelations = relations(
  userInvitations,
  ({ one }) => ({
    user: one(users, {
      fields: [userInvitations.userId],
      references: [users.id],
    }),
    member: one(enterprisesMembers, {
      fields: [userInvitations.memberId],
      references: [enterprisesMembers.id],
    }),
  }),
);

export const usersPersonalInfoRelations = relations(
  usersPersonalInfo,
  ({ one }) => ({
    user: one(users, {
      fields: [usersPersonalInfo.userId],
      references: [users.id],
    }),
  }),
);

export const usersAddressRelations = relations(usersAddress, ({ one }) => ({
  user: one(users, {
    fields: [usersAddress.userId],
    references: [users.id],
  }),
  cep: one(ceps, {
    fields: [usersAddress.cepId],
    references: [ceps.id],
  }),
}));

export const usersContactRelations = relations(usersContact, ({ one }) => ({
  user: one(users, {
    fields: [usersContact.userId],
    references: [users.id],
  }),
}));

export const usersRelationshipsRelations = relations(
  usersRelationships,
  ({ one }) => ({
    user: one(users, {
      fields: [usersRelationships.userId],
      references: [users.id],
    }),
  }),
);

export const usersTaxInfosRelations = relations(usersTaxInfos, ({ one }) => ({
  user: one(users, {
    fields: [usersTaxInfos.userId],
    references: [users.id],
  }),
}));

export const usersFinancialInfoRelations = relations(
  usersFinancialInfo,
  ({ one }) => ({
    user: one(users, {
      fields: [usersFinancialInfo.userId],
      references: [users.id],
    }),
  }),
);
