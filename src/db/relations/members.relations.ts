import { relations } from "drizzle-orm";
import { enterprisesMembers, userInvitations } from "../entities/members.js";
import { users } from "../entities/users.js";
import { enterprises } from "../entities/enterprises.js";
import { typeSupplierCustomers } from "../entities/members.js";
import { typeNetworks } from "../entities/members.js";
import { mechanicSalesItems } from "../entities/sales.js";
import { memberModules } from "../entities/modules.js";
import { benefitTypeCostumers, nfeHeaders } from "../entities/nfe.js";

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
    modules: many(memberModules),
    invitations: many(userInvitations),
    mechanicSalesItems: many(mechanicSalesItems),
    nfeEmitted: many(nfeHeaders, { relationName: "nfeEmitMember" }),
    nfeReceived: many(nfeHeaders, { relationName: "nfeDestMember" }),
  }),
);

export const typeSupplierCustomersRelations = relations(
  typeSupplierCustomers,
  ({ one, many }) => ({
    enterprise: one(enterprises, {
      fields: [typeSupplierCustomers.enterpriseId],
      references: [enterprises.id],
    }),
    members: many(enterprisesMembers),
    benefits: many(benefitTypeCostumers),
  }),
);

export const typeNetworksRelations = relations(
  typeNetworks,
  ({ one, many }) => ({
    enterprise: one(enterprises, {
      fields: [typeNetworks.enterpriseId],
      references: [enterprises.id],
    }),
    members: many(enterprisesMembers),
  }),
);
