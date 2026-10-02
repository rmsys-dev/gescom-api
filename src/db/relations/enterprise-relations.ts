import { relations } from "drizzle-orm";
import {
  enterpriseGroups,
  enterprises,
  enterprisesAddress,
  enterpriseParameters,
  enterprisesSequences,
} from "../entities/enterprises.js";
import { ceps } from "../entities/addresses.js";
import {
  enterprisesMembers,
  typeNetworks,
  typeSupplierCustomers,
} from "../entities/members.js";
import { sectors } from "../entities/sector.js";
import {
  productBrands,
  productGroups,
  productSubgroups,
} from "../entities/products.js";
import {
  cfopsEnterprises,
  enterprisesNfe,
  enterprisesNfeCertificates,
  nfeEvents,
  nfeHeaders,
} from "../entities/nfe.js";

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
  }),
);

//**RELAÇÕES DE GRUPOS DE EMPRESAS**//
export const enterpriseGroupsRelations = relations(enterpriseGroups, ({ many }) => ({
  enterprises: many(enterprises),
}));

//**RELAÇÕES DE EMPRESAS**//
export const enterprisesRelations = relations(enterprises, ({ one, many }) => ({
  group: one(enterpriseGroups, {
    fields: [enterprises.groupId],
    references: [enterpriseGroups.id],
  }),
  members: many(enterprisesMembers),
  addresses: many(enterprisesAddress),
  sequences: many(enterprisesSequences),
  parameters: many(enterpriseParameters),
  sectors: many(sectors),
  productGroups: many(productGroups),
  productSubgroups: many(productSubgroups),
  productBrands: many(productBrands),
  nfeConfig: many(enterprisesNfe),
  nfeCertificates: many(enterprisesNfeCertificates),
  nfeHeaders: many(nfeHeaders),
  nfeEvents: many(nfeEvents),
  cfops: many(cfopsEnterprises),
  typeSupplierCustomers: many(typeSupplierCustomers),
  typeNetworks: many(typeNetworks),
}));

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

//**RELAÇÕES DE PARÂMETROS DE EMPRESAS**//
export const enterpriseParametersRelations = relations(
  enterpriseParameters,
  ({ one }) => ({
    enterprise: one(enterprises, {
      fields: [enterpriseParameters.enterpriseId],
      references: [enterprises.id],
    }),
  }),
);
