import { relations } from "drizzle-orm";
import {
  enterprises,
  enterprisesAddress,
  enterpriseParameters,
  enterprisesSequences,
} from "../entities/enterprises.js";
import { ceps } from "../entities/addresses.js";
import { enterprisesMembers } from "../entities/members.js";
import { sectors } from "../entities/sector.js";
import {
  productBrands,
  productGroups,
  productSubgroups,
  productTypes,
  typeSped,
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
  }),
);

//**RELAÇÕES DE EMPRESAS**//
export const enterprisesRelations = relations(enterprises, ({ many }) => ({
  members: many(enterprisesMembers),
  addresses: many(enterprisesAddress),
  sequences: many(enterprisesSequences),
  parameters: many(enterpriseParameters),
  sectors: many(sectors),
  productGroups: many(productGroups),
  productSubgroups: many(productSubgroups),
  productBrands: many(productBrands),
  productTypes: many(productTypes),
  typeSped: many(typeSped),
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
