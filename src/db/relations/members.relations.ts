import { relations } from "drizzle-orm";
import { enterprises } from "../entities/enterprises.js";
import {
  enterprisesMembers,
  userInvitations,
  memberExtraPermissions,
} from "../entities/members.js";
import { departments } from "../entities/departments.js";
import {
  membersDepartments,
  memberPermissionsDefault,
} from "../entities/members.js";
import { users } from "../entities/users.js";
import { typeSupplierCustomers } from "../entities/typeSupplierCustomers.js";
import { typeNetworks } from "../entities/typeNetworks.js";

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
