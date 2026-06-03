import { relations } from "drizzle-orm";
import { ceps, countries, states, cities } from "../entities/addresses.js";
import { enterprisesMembers, userInvitations } from "../entities/members.js";
import {
  users,
  usersAddress,
  usersContact,
  usersRelationships,
  usersTaxInfos,
  usersFinancialInfo,
  usersPersonalInfo,
} from "../entities/users.js";
import {
  usersCredentials,
  userSessions,
  passwordResetTokens,
} from "../entities/authentication.js";

export const usersRelations = relations(users, ({ many, one }) => ({
  memberships: many(enterprisesMembers),
  credentials: many(usersCredentials),
  passwordResetTokens: many(passwordResetTokens),
  personalInfo: one(usersPersonalInfo),
  addresses: many(usersAddress),
  contacts: many(usersContact),
  relationships: one(usersRelationships),
  taxInfos: one(usersTaxInfos),
  financialInfo: one(usersFinancialInfo),
  sessions: many(userSessions),
}));

//**RELAÇÕES DE INFORMAÇÕES PESSOAIS**//
export const usersPersonalInfoRelations = relations(
  usersPersonalInfo,
  ({ one }) => ({
    user: one(users, {
      fields: [usersPersonalInfo.userId],
      references: [users.id],
    }),
  }),
);

//**RELAÇÕES DE ENDEREÇOS DE USUÁRIOS**//
export const usersAddressRelations = relations(usersAddress, ({ one }) => ({
  user: one(users, {
    fields: [usersAddress.userId],
    references: [users.id],
  }),
  cep: one(ceps, {
    fields: [usersAddress.cepId],
    references: [ceps.id],
  }),
  country: one(countries, {
    fields: [usersAddress.countryId],
    references: [countries.id],
  }),
  state: one(states, {
    fields: [usersAddress.stateId],
    references: [states.id],
  }),
  city: one(cities, {
    fields: [usersAddress.cityId],
    references: [cities.id],
  }),
}));

//**RELAÇÕES DE CONTATOS DE USUÁRIOS**//
export const usersContactRelations = relations(usersContact, ({ one }) => ({
  user: one(users, {
    fields: [usersContact.userId],
    references: [users.id],
  }),
}));

//**RELAÇÕES DE RELACIONAMENTOS DE USUÁRIOS**//
export const usersRelationshipsRelations = relations(
  usersRelationships,
  ({ one }) => ({
    user: one(users, {
      fields: [usersRelationships.userId],
      references: [users.id],
    }),
  }),
);

//**RELAÇÕES DE INFORMAÇÕES FISCAIS DE USUÁRIOS**//
export const usersTaxInfosRelations = relations(usersTaxInfos, ({ one }) => ({
  user: one(users, {
    fields: [usersTaxInfos.userId],
    references: [users.id],
  }),
}));

//**RELAÇÕES DE INFORMAÇÕES FINANCEIRAS DE USUÁRIOS**//
export const usersFinancialInfoRelations = relations(
  usersFinancialInfo,
  ({ one }) => ({
    user: one(users, {
      fields: [usersFinancialInfo.userId],
      references: [users.id],
    }),
  }),
);

//**RELAÇÕES DE INVITAÇÕES DE USUÁRIOS**//
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
