import { relations } from "drizzle-orm";
import {
  enterprises,
  enterprisesAddress,
  enterpriseParameters,
  enterprisesSequences,
} from "../entities/enterprises.js";
import { ceps } from "../entities/addresses.js";
import { enterprisesMembers } from "../entities/members.js";
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
  }),
);

//**RELAÇÕES DE EMPRESAS**//
export const enterprisesRelations = relations(enterprises, ({ many }) => ({
  members: many(enterprisesMembers),
  addresses: many(enterprisesAddress),
  sequences: many(enterprisesSequences),
  parameters: many(enterpriseParameters),
  stockSectors: many(stockSectors),
  productGroups: many(productGroups),
  productSubgroups: many(productSubgroups),
  productBrands: many(productBrands),
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
