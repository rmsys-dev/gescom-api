import { relations } from "drizzle-orm";
import { enterprises, enterprisesAddress } from "../entities/enterprises.js";
import { ceps, countries, states, cities } from "../entities/addresses.js";
import { enterprisesMembers } from "../entities/members.js";
import { enterprisesSequences } from "../entities/sequences.js";
import { departments } from "../entities/departments.js";
import { membersDepartments } from "../entities/members.js";
import { departmentDefaultPermissions } from "../entities/departments.js";
import { stockSectors } from "../entities/stock.js";
import {
  productBrands,
  productGroups,
  productSubgroups,
} from "../entities/products.js";

//**RELAÇÕES DE ENDEREÇOS DE EMPRESAS**//
export const enterprisesAddressRelations = relations(
  enterprisesAddress,
  ({ one }) => ({
    enterprise: one(enterprises, {
      fields: [enterprisesAddress.enterpriseId],
      references: [enterprises.id],
    }),
    cep: one(ceps, {
      fields: [enterprisesAddress.cepId],
      references: [ceps.id],
    }),
    country: one(countries, {
      fields: [enterprisesAddress.countryId],
      references: [countries.id],
    }),
    state: one(states, {
      fields: [enterprisesAddress.stateId],
      references: [states.id],
    }),
    city: one(cities, {
      fields: [enterprisesAddress.cityId],
      references: [cities.id],
    }),
  }),
);

//**RELAÇÕES DE EMPRESAS**//
export const enterprisesRelations = relations(enterprises, ({ many }) => ({
  members: many(enterprisesMembers),
  addresses: many(enterprisesAddress),
  sequences: many(enterprisesSequences),
  stockSectors: many(stockSectors),
  productGroups: many(productGroups),
  productSubgroups: many(productSubgroups),
  productBrands: many(productBrands),
}));

//**RELAÇÕES DE DEPARTAMENTOS**//
export const departmentsRelations = relations(departments, ({ many }) => ({
  membersDepartments: many(membersDepartments),
  defaultPermissions: many(departmentDefaultPermissions),
}));

//**RELAÇÕES DE PERMISSÕES PADRÃO DE DEPARTAMENTOS**//
export const departmentDefaultPermissionsRelations = relations(
  departmentDefaultPermissions,
  ({ one }) => ({
    department: one(departments, {
      fields: [departmentDefaultPermissions.departmentId],
      references: [departments.id],
    }),
  }),
);

//**RELAÇÕES DE SEQUÊNCIAS**//
export const enterprisesSequencesRelations = relations(
  enterprisesSequences,
  ({ one }) => ({
    enterprise: one(enterprises, {
      fields: [enterprisesSequences.enterpriseId],
      references: [enterprises.id],
    }),
  }),
);
