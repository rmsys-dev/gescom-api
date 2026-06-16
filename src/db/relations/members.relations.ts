import { relations } from "drizzle-orm";
import { ceps, countries, states, cities } from "../entities/addresses.js";
import { enterprisesMembers, userInvitations } from "../entities/members.js";
import {
  membersAddress,
  membersContact,
  membersRelationships,
  membersTaxInfos,
  membersFinancialInfo,
  membersPersonalInfo,
  memberExtraPermissions,
  membersDepartments,
  memberPermissionsDefault,
} from "../entities/members.js";
import { users } from "../entities/users.js";
import { enterprises } from "../entities/enterprises.js";
import { departments } from "../entities/departments.js";
import { typeSupplierCustomers } from "../entities/typeSupplierCustomers.js";
import { typeNetworks } from "../entities/typeNetworks.js";
import {
  usersCredentials,
  userSessions,
  passwordResetTokens,
} from "../entities/authentication.js";

//**RELAÇÕES DE USUÁRIOS**//
export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(enterprisesMembers),
  credentials: many(usersCredentials),
  passwordResetTokens: many(passwordResetTokens),
  sessions: many(userSessions),
}));

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

//**RELAÇÕES DE MEMBROS DE EMPRESAS**//
export const enterprisesMembersRelations = relations(
  enterprisesMembers,
  ({ one, many }) => ({
    user: one(users, {
      fields: [enterprisesMembers.userId],
      references: [users.id],
    }),
    enterprise: one(enterprises, {
      fields: [enterprisesMembers.enterpriseId],
      references: [enterprises.id],
    }),
    typeSupplierCustomer: one(typeSupplierCustomers, {
      fields: [enterprisesMembers.typeSupplierCustomerId],
      references: [typeSupplierCustomers.id],
    }),
    typeNetwork: one(typeNetworks, {
      fields: [enterprisesMembers.typeNetworkId],
      references: [typeNetworks.id],
    }),
    departments: many(membersDepartments),
    invitations: many(userInvitations),
    personalInfo: one(membersPersonalInfo),
    addresses: many(membersAddress),
    contacts: many(membersContact),
    relationships: one(membersRelationships),
    taxInfos: one(membersTaxInfos),
    financialInfo: one(membersFinancialInfo),
  }),
);

//**RELAÇÕES DE INFORMAÇÕES PESSOAIS DE MEMBROS**//
export const membersPersonalInfoRelations = relations(
  membersPersonalInfo,
  ({ one }) => ({
    member: one(enterprisesMembers, {
      fields: [membersPersonalInfo.memberId],
      references: [enterprisesMembers.id],
    }),
  }),
);

//**RELAÇÕES DE ENDEREÇOS DE MEMBROS**//
export const membersAddressRelations = relations(membersAddress, ({ one }) => ({
  member: one(enterprisesMembers, {
    fields: [membersAddress.memberId],
    references: [enterprisesMembers.id],
  }),
  cep: one(ceps, {
    fields: [membersAddress.cepId],
    references: [ceps.id],
  }),
  country: one(countries, {
    fields: [membersAddress.countryId],
    references: [countries.id],
  }),
  state: one(states, {
    fields: [membersAddress.stateId],
    references: [states.id],
  }),
  city: one(cities, {
    fields: [membersAddress.cityId],
    references: [cities.id],
  }),
}));

//**RELAÇÕES DE CONTATOS DE MEMBROS**//
export const membersContactRelations = relations(membersContact, ({ one }) => ({
  member: one(enterprisesMembers, {
    fields: [membersContact.memberId],
    references: [enterprisesMembers.id],
  }),
}));

//**RELAÇÕES DE RELACIONAMENTOS DE MEMBROS**//
export const membersRelationshipsRelations = relations(
  membersRelationships,
  ({ one }) => ({
    member: one(enterprisesMembers, {
      fields: [membersRelationships.memberId],
      references: [enterprisesMembers.id],
    }),
  }),
);

//**RELAÇÕES DE INFORMAÇÕES FISCAIS DE MEMBROS**//
export const membersTaxInfosRelations = relations(
  membersTaxInfos,
  ({ one }) => ({
    member: one(enterprisesMembers, {
      fields: [membersTaxInfos.memberId],
      references: [enterprisesMembers.id],
    }),
  }),
);

//**RELAÇÕES DE INFORMAÇÕES FINANCEIRAS DE MEMBROS**//
export const membersFinancialInfoRelations = relations(
  membersFinancialInfo,
  ({ one }) => ({
    member: one(enterprisesMembers, {
      fields: [membersFinancialInfo.memberId],
      references: [enterprisesMembers.id],
    }),
  }),
);

//**RELAÇÕES DE DEPARTAMENTOS DE MEMBROS DE EMPRESAS**//
export const membersDepartmentsRelations = relations(
  membersDepartments,
  ({ one, many }) => ({
    member: one(enterprisesMembers, {
      fields: [membersDepartments.memberId],
      references: [enterprisesMembers.id],
    }),
    department: one(departments, {
      fields: [membersDepartments.departmentId],
      references: [departments.id],
    }),
    permissionsDefault: many(memberPermissionsDefault),
    extraPermissions: many(memberExtraPermissions),
  }),
);

//**RELAÇÕES DE PERMISSÕES PADRÃO DE MEMBROS DE EMPRESAS**//
export const memberPermissionsDefaultRelations = relations(
  memberPermissionsDefault,
  ({ one }) => ({
    memberDepartment: one(membersDepartments, {
      fields: [memberPermissionsDefault.memberDepartmentId],
      references: [membersDepartments.id],
    }),
  }),
);

//**RELAÇÕES DE PERMISSÕES EXTRAS DE MEMBROS DE EMPRESAS**//
export const memberExtraPermissionsRelations = relations(
  memberExtraPermissions,
  ({ one }) => ({
    memberDepartment: one(membersDepartments, {
      fields: [memberExtraPermissions.memberDepartmentId],
      references: [membersDepartments.id],
    }),
  }),
);
