import { relations } from "drizzle-orm";
import {
  enterprises,
  enterprisesAddress,
  enterprisesLogos,
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
export const enterprisesRelations = relations(enterprises, ({ many, one }) => ({
  members: many(enterprisesMembers),
  addresses: many(enterprisesAddress),
  sequences: many(enterprisesSequences),
  parameters: many(enterpriseParameters),
  logo: one(enterprisesLogos, {
    fields: [enterprises.id],
    references: [enterprisesLogos.enterpriseId],
  }),
  sectors: many(sectors),
  productGroups: many(productGroups),
  productSubgroups: many(productSubgroups),
  productBrands: many(productBrands),
}));

//**RELAÇÕES DE LOGOS DE EMPRESAS**//
export const enterprisesLogosRelations = relations(
  enterprisesLogos,
  ({ one }) => ({
    enterprise: one(enterprises, {
      fields: [enterprisesLogos.enterpriseId],
      references: [enterprises.id],
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
