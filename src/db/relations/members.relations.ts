import { relations } from "drizzle-orm";
import {
  enterprisesMembers,
  memberExtraPermissions,
  membersDepartments,
  memberPermissionsDefault,
  userInvitations,
} from "../entities/members.js";
import { users } from "../entities/users.js";
import { enterprises } from "../entities/enterprises.js";
import { departments } from "../entities/departments.js";
import { typeSupplierCustomers } from "../entities/members.js";
import { typeNetworks } from "../entities/members.js";
import { mechanicSalesItems } from "../entities/sales.js";

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
    mechanicSalesItems: many(mechanicSalesItems),
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

export const typeSupplierCustomersRelations = relations(
  typeSupplierCustomers,
  ({ many }) => ({
    members: many(enterprisesMembers),
  }),
);

export const typeNetworksRelations = relations(typeNetworks, ({ many }) => ({
  members: many(enterprisesMembers),
}));
